import { useMemo, useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz, colorSchemeDark } from 'ag-grid-community';

// Module initialisation
ModuleRegistry.registerModules([AllCommunityModule]);

import type { MemoryChannel } from '../lib/types';
import { defaultChannels } from '../lib/types';
import { fetchRepeaterBook } from '../lib/repeaterbook';
import { getPmr446Channels } from '../lib/pmr';
import { Copy, Trash2, Plus, Eraser, Globe, X, Loader2, Radio, ListX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { ChannelDetail } from './ChannelDetail';

export function MemoryGrid({
  data = defaultChannels,
  onDataChanged,
  isDarkMode,
  limits,
  channelCount = 128
}: {
  data?: MemoryChannel[],
  onDataChanged?: (data: MemoryChannel[]) => void,
  isDarkMode?: boolean,
  limits?: { min: number, max: number }[],
  channelCount?: number
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rowData, setRowData] = useState<MemoryChannel[]>(data);
  const [selectedCount, setSelectedCount] = useState(0);
  const [activeZone, setActiveZone] = useState<number>(0);
  const [rbModalOpen, setRbModalOpen] = useState(false);
  const [rbCountry, setRbCountry] = useState("Spain");
  const [isRbLoading, setIsRbLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lon: number} | null>(null);
  const [clearAllPending, setClearAllPending] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState<MemoryChannel | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    if (!clearAllPending) return;
    const timer = setTimeout(() => setClearAllPending(false), 3000);
    return () => clearTimeout(timer);
  }, [clearAllPending]);

  // Memoize the theme so AG Grid does not recreate the UI on theme-only changes
  const gridTheme = useMemo(() => {
    return isDarkMode ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;
  }, [isDarkMode]);

  // Watch for new data from USB reads, forcing AG Grid to fully refresh
  useEffect(() => {
    setRowData(data);
    if (gridRef.current && gridRef.current.api) {
       gridRef.current.api.setGridOption("rowData", data);
    }
  }, [data]);

  useEffect(() => {
    setActiveZone(0);
    if (gridRef.current?.api) gridRef.current.api.onFilterChanged();
  }, [channelCount]);

  const processPasteData = (text: string) => {
    if (!text) return;
    
    const rows = text.split('\n').filter(r => r.trim() !== '');
    const newChannels: MemoryChannel[] = [];
    
    rows.forEach((row, idx) => {
      // Detect whether the data is tab-separated (Excel) or comma-separated (CSV)
      const separator = row.includes('\t') ? '\t' : ',';
      const cols = row.split(separator);
      if (cols.length < 2) return; // Need at least index and frequency
      
      newChannels.push({
        index: parseInt(cols[0]) || rowData.length + idx + 1,
        frequency: cols[1] || "145.000000",
        name: cols[2] || "",
        toneMode: cols[3] as any || "None",
        tone: cols[4] || "88.5",
        toneSql: cols[5] || "88.5",
        dtcsCode: cols[6] || "023",
        rxDtcsCode: cols[7] || "023",
        dtcsPolarity: cols[8] as any || "NN",
        duplex: cols[9] as any || "None",
        offset: cols[10] || "0.000000",
        mode: cols[11] as any || "FM",
        power: cols[12] as any || "High",
        skip: cols[13] ? cols[13].toLowerCase() === 'true' : false
      });
    });
    
    if (newChannels.length > 0) {
      setRowData(prev => [...prev, ...newChannels]);
      toast.success(t('grid.alerts.pasteSuccess', { count: newChannels.length }));
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      // Async attempt (only works in Chrome/Edge with direct clipboard permissions)
      const text = await navigator.clipboard.readText();
      processPasteData(text);
    } catch (err) {
      console.warn("Async clipboard API failed, please use Ctrl+V directly", err);
      toast.error(t('grid.alerts.pasteFallback'));
    }
  };

  // Escolta l'esdeveniment universal "Ctrl+V" o Comand+V per Firefox i Web Safari
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (text) {
        processPasteData(text);
      }
    };
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [rowData]);

  const handleAddChannel = () => {
    const presentIndexes = rowData.map(r => r.index);
    const nextId = presentIndexes.length > 0 ? Math.max(...presentIndexes) + 1 : 1;

    if (nextId > 999) {
      toast.error(t('grid.alerts.maxChannels', { defaultValue: 'Cannot add more channels, maximum limit is 999.' }));
      return;
    }

    const newChannel: MemoryChannel = {
      index: nextId,
      frequency: "145.000000",
      name: "",
      toneMode: "None",
      tone: "88.5",
      toneSql: "88.5",
      dtcsCode: "023",
      rxDtcsCode: "023",
      dtcsPolarity: "NN",
      duplex: "None",
      offset: "0.000000",
      mode: "FM",
      power: "High",
      skip: false
    };

    const newRowData = [...rowData, newChannel].sort((a,b) => a.index - b.index); // Sort to avoid jarring visual jumps
    setRowData(newRowData);
    if (onDataChanged) onDataChanged(newRowData);
    
    // Optionally scroll to the new row at the bottom
    setTimeout(() => {
        if (gridRef.current) gridRef.current.api.ensureIndexVisible(newRowData.findIndex(r => r.index === nextId), 'bottom');
    }, 100);
  };

  const handleAddPMR = () => {
    const presentIndexes = rowData.map(r => r.index);
    const nextId = presentIndexes.length > 0 ? Math.max(...presentIndexes) + 1 : 1;

    if (nextId + 16 > 999) {
      toast.error(t('grid.alerts.insufficientSpace', {
        defaultValue: 'Insufficient space ({{free}} free). 16 slots needed for PMR446.',
        free: 999 - nextId
      }));
      return;
    }

    const pmrChannels = getPmr446Channels(nextId);
    const newRowData = [...rowData, ...pmrChannels].sort((a,b) => a.index - b.index);
    
    setRowData(newRowData);
    if (onDataChanged) onDataChanged(newRowData);
    
    setTimeout(() => {
        if (gridRef.current) gridRef.current.api.ensureIndexVisible(newRowData.findIndex(r => r.index === nextId + 15), 'bottom');
    }, 100);
  };



  const handleClearSelected = () => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    const newRowData = [...rowData];
    selectedNodes.forEach(node => {
      const idx = newRowData.findIndex(r => r.index === node.data.index);
      if (idx !== -1) {
        newRowData[idx] = {
           index: node.data.index,
           frequency: "",
           name: "",
           toneMode: "None",
           tone: "88.5",
           toneSql: "88.5",
           dtcsCode: "023",
           rxDtcsCode: "023",
           dtcsPolarity: "NN",
           duplex: "None",
           offset: "0.000000",
           mode: "FM",
           power: "High",
           skip: false
        };
      }
    });

    setRowData(newRowData);
    if (onDataChanged) onDataChanged(newRowData);
  };

  const handleClearAll = () => {
    if (!clearAllPending) {
      setClearAllPending(true);
      return;
    }
    setClearAllPending(false);
    setRowData([]);
    if (onDataChanged) onDataChanged([]);
  };

  const handleDeleteSelected = () => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    const indexesToRemove = selectedNodes.map(n => n.data.index);
    const newRowData = rowData.filter(r => !indexesToRemove.includes(r.index));
    
    setRowData(newRowData);
    if (onDataChanged) onDataChanged(newRowData);
  };

  const handleBulkEdit = (field: keyof MemoryChannel, value: any) => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    const newRowData = [...rowData];
    selectedNodes.forEach(node => {
      const idx = newRowData.findIndex(r => r.index === node.data.index);
      if (idx !== -1) {
        newRowData[idx] = { ...newRowData[idx], [field]: value };
      }
    });

    setRowData(newRowData);
    if (onDataChanged) onDataChanged(newRowData);
  };

  const handleFetchRepeaterBook = async (country: string, state: string, band: 'ALL'|'VHF'|'UHF', lat?: number, lon?: number) => {
    try {
      setIsRbLoading(true);
      let newChannels = await fetchRepeaterBook(country, state, band, lat, lon);
      
      if (limits && limits.length > 0) {
        newChannels = newChannels.filter(ch => {
           const freq = parseFloat(ch.frequency);
           return limits.some(l => freq >= l.min && freq <= l.max);
        });
      }
      
      if (newChannels.length === 0) {
        toast.error(t('grid.alerts.noRepeaters', {
          defaultValue: 'No repeaters found for this region compatible with the selected radio.'
        }));
        setIsRbLoading(false);
        return;
      }
      
      const presentIndexes = rowData.map(r => r.index);
      let nextId = presentIndexes.length > 0 ? Math.max(...presentIndexes) + 1 : 1;
      
      // Assign sequential free indexes
      const assignedChannels = newChannels.map(ch => {
        const c = { ...ch, index: nextId };
        nextId++;
        return c;
      });
      
      if (nextId > 999) {
        toast.error(t('grid.alerts.limitsExceeded', {
          defaultValue: 'Warning: {{count}} repeaters imported but 999 channel limit exceeded.',
          count: newChannels.length
        }));
      }

      const newRowData = [...rowData, ...assignedChannels].sort((a,b) => a.index - b.index);
      setRowData(newRowData);
      if (onDataChanged) onDataChanged(newRowData);
      setRbModalOpen(false);
      toast.success(t('grid.alerts.repeatersAdded', {
        defaultValue: '{{count}} repeaters added successfully.',
        count: newChannels.length
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(t('grid.alerts.integrationFailed', {
        defaultValue: 'Integration failed: {{error}}',
        error: errorMessage
      }));
    } finally {
      setIsRbLoading(false);
    }
  };

  const handleZoneChange = (zoneId: number) => {
    setActiveZone(zoneId);
    if (gridRef.current) {
      gridRef.current.api.onFilterChanged();
    }
  };

  // Columnes del grid de memòria
  const columnDefs = useMemo(() => [
    { field: 'index', headerName: t('grid.columns.loc'), width: 60, pinned: 'left', editable: false },
    { 
      field: 'frequency', 
      headerName: t('grid.columns.frequency'), 
      width: 130,
      valueSetter: (params: any) => {
        const newVal = params.newValue;
        if (!newVal || newVal.trim() === '') {
           params.data.frequency = "";
           return true;
        }
        
        const freq = parseFloat(newVal);
        if (isNaN(freq)) {
          toast.error(t('grid.alerts.invalidFrequency'));
          return false;
        }

        const isVHF = freq >= 136 && freq <= 174;
        const isUHF = freq >= 400 && freq <= 520;

        const isValid = limits && limits.length > 0
          ? limits.some(limit => freq >= limit.min && freq <= limit.max)
          : (isVHF || isUHF); // Fallback to hardcoded if no limits specified

        if (isValid) {
           params.data.frequency = freq.toFixed(6);
           return true;
        }

        toast.error(t('grid.alerts.invalidFrequency'));
        return false;
      },
      cellClassRules: {
        'bg-[color-mix(in_srgb,var(--sig-red)_10%,var(--w-bg-elev))] text-sig-red': (params: any) => {
           if (!params.value || params.value.trim() === '') return false;
           const freq = parseFloat(params.value);
           if (isNaN(freq)) return true;
           if (limits && limits.length > 0) {
             return !limits.some((l: any) => freq >= l.min && freq <= l.max);
           }
           const isVHF = freq >= 136 && freq <= 174;
           const isUHF = freq >= 400 && freq <= 520;
           return !(isVHF || isUHF);
        }
      },
      tooltipValueGetter: (params: any) => {
        if (!params.value || params.value.trim() === '') return null;
        const freq = parseFloat(params.value);
        const isInvalid = isNaN(freq) || (limits && limits.length > 0
          ? !limits.some((l: any) => freq >= l.min && freq <= l.max)
          : !(freq >= 136 && freq <= 174) && !(freq >= 400 && freq <= 520));
        return isInvalid ? t('grid.alerts.outOfRange') : null;
      },
      cellRenderer: (params: any) => {
        if (!params.value || params.value.trim() === '') return params.value || '';
        const freq = parseFloat(params.value);
        const isInvalid = isNaN(freq) || (limits && limits.length > 0
          ? !limits.some((l: any) => freq >= l.min && freq <= l.max)
          : !(freq >= 136 && freq <= 174) && !(freq >= 400 && freq <= 520));
        if (!isInvalid) return params.value;
        return `<span style="display:flex;align-items:center;gap:5px"><span style="font-size:11px;line-height:1">⚠</span>${params.value}</span>`;
      },
    },
    { field: 'name', headerName: t('grid.columns.name'), width: 120 },
    { 
      field: 'toneMode', 
      headerName: t('grid.columns.toneMode'), 
      width: 120,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['None', 'Tone', 'TSQL', 'DTCS', 'Cross']
      }
    },
    { field: 'tone', headerName: t('grid.columns.tone'), width: 90 },
    { field: 'toneSql', headerName: t('grid.columns.toneSql'), width: 100 },
    { field: 'dtcsCode', headerName: t('grid.columns.dtcsCode'), width: 110 },
    { field: 'rxDtcsCode', headerName: t('grid.columns.rxDtcsCode'), width: 130 },
    { 
      field: 'dtcsPolarity', 
      headerName: t('grid.columns.dtcsPol'), 
      width: 100,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['NN', 'NR', 'RN', 'RR'] }
    },
    { 
      field: 'duplex', 
      headerName: t('grid.columns.duplex'), 
      width: 90,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['None', '+', '-', 'Split'] }
    },
    { field: 'offset', headerName: t('grid.columns.offset'), width: 100 },
    { 
      field: 'mode', 
      headerName: t('grid.columns.mode'), 
      width: 90,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['FM', 'NFM', 'AM'] }
    },
    { 
      field: 'power', 
      headerName: t('grid.columns.power'), 
      width: 90,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['High', 'Low'] }
    },
    { field: 'skip', headerName: t('grid.columns.skip'), width: 80, cellEditor: 'agCheckboxCellEditor' },
    {
      field: 'distance',
      headerName: t('grid.columns.distance'),
      width: 120,
      editable: false,
      valueFormatter: (params: any) => params.value ? `${params.value.toFixed(1)} km` : ''
    }
  ], [t]);

  const defaultColDef = useMemo(() => ({
    editable: true,
    sortable: true,
    filter: true,
    resizable: true
  }), []);

  return (
    <div className="flex flex-col h-full w-full bg-w-bg-elev overflow-hidden transition-colors duration-300">
      {/* Zone tabs — top level */}
      {channelCount > 32 && (
        <div className="flex items-center gap-0 border-b border-w-border bg-w-bg-elev shrink-0 overflow-x-auto scrollbar-hide">
          {[
            { id: 0, key: 'all' },
            { id: 1, key: 'z1' },
            { id: 2, key: 'z2' },
            { id: 3, key: 'z3' },
            { id: 4, key: 'z4' }
          ].map(zone => (
            <button
              key={zone.id}
              onClick={() => handleZoneChange(zone.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeZone === zone.id
                  ? 'border-w-accent text-w-accent-fg bg-w-bg-elev'
                  : 'border-transparent text-w-fg-mute hover:text-w-fg-soft hover:bg-w-bg-hover'
              }`}
            >
              {t(`grid.zones.${zone.key}`)}
            </button>
          ))}
        </div>
      )}

      {/* Compact toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-w-border bg-w-bg-sunken shrink-0 overflow-x-auto scrollbar-hide transition-colors duration-300">
        <button onClick={handlePasteFromClipboard} title={t('grid.buttons.paste')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-w-fg-soft bg-w-bg-elev border border-w-border rounded-theme-md hover:bg-w-bg-hover transition-colors">
          <Copy className="w-3.5 h-3.5" /> {t('grid.buttons.paste')}
        </button>

        <div className="h-4 w-px bg-w-border mx-0.5 shrink-0" />

        <button onClick={handleAddChannel} title={t('grid.buttons.add')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sig-green bg-w-bg-elev border border-w-border rounded-theme-md hover:bg-w-bg-hover transition-colors">
          <Plus className="w-3.5 h-3.5" /> {t('grid.buttons.add')}
        </button>
        <button onClick={() => setRbModalOpen(true)} title={t('grid.buttons.repeaterbook')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sig-green bg-w-bg-elev border border-w-border rounded-theme-md hover:bg-w-bg-hover transition-colors">
          <Globe className="w-3.5 h-3.5" /> {t('grid.buttons.repeaterbook')}
        </button>
        <button onClick={handleAddPMR} title={t('grid.buttons.addPmr')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sig-green bg-w-bg-elev border border-w-border rounded-theme-md hover:bg-w-bg-hover transition-colors">
          <Radio className="w-3.5 h-3.5" /> {t('grid.buttons.addPmr')}
        </button>

        <div className="h-4 w-px bg-w-border mx-0.5 shrink-0" />

        <button onClick={handleClearSelected} title={t('grid.buttons.clear')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sig-amber bg-w-bg-elev border border-w-border rounded-theme-md hover:bg-w-bg-hover transition-colors">
          <Eraser className="w-3.5 h-3.5" /> {t('grid.buttons.clear')}
        </button>
        <button onClick={handleDeleteSelected} title={t('grid.buttons.delete')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sig-red bg-w-bg-elev border border-w-border rounded-theme-md hover:bg-w-bg-hover transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> {t('grid.buttons.delete')}
        </button>

        <div className="h-4 w-px bg-w-border mx-0.5 shrink-0" />

        <button onClick={handleClearAll} onBlur={() => setClearAllPending(false)} aria-pressed={clearAllPending}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-theme-md border transition-colors ${
            clearAllPending ? 'bg-sig-red text-white border-sig-red font-bold' : 'text-sig-red bg-w-bg-elev border-w-border hover:bg-w-bg-hover'
          }`}>
          <ListX className="w-3.5 h-3.5" />
          {clearAllPending ? t('grid.alerts.confirmClearAllShort', { count: rowData.length }) : t('grid.buttons.clearAll')}
        </button>

        {/* Bulk Edit */}
        {selectedCount > 1 && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-w-border-strong">
            <span className="text-[10px] font-black uppercase text-w-fg-faint tracking-widest font-mono">{selectedCount} sel.</span>
            <select className="text-xs font-medium text-w-fg bg-w-bg-elev border border-w-border rounded-theme-sm py-1 px-1.5 cursor-pointer"
              onChange={(e) => { if(e.target.value) { handleBulkEdit('power', e.target.value); e.target.value = ''; } }} defaultValue="">
              <option value="" disabled>{t('grid.bulkEdit.power')}</option>
              <option value="High">High</option><option value="Low">Low</option>
            </select>
            <select className="text-xs font-medium text-w-fg bg-w-bg-elev border border-w-border rounded-theme-sm py-1 px-1.5 cursor-pointer"
              onChange={(e) => { if(e.target.value) { handleBulkEdit('mode', e.target.value); e.target.value = ''; } }} defaultValue="">
              <option value="" disabled>{t('grid.bulkEdit.mode')}</option>
              <option value="FM">FM</option><option value="NFM">NFM</option><option value="AM">AM</option>
            </select>
            <select className="text-xs font-medium text-w-fg bg-w-bg-elev border border-w-border rounded-theme-sm py-1 px-1.5 cursor-pointer"
              onChange={(e) => { if(e.target.value) { handleBulkEdit('toneMode', e.target.value); e.target.value = ''; } }} defaultValue="">
              <option value="" disabled>{t('grid.bulkEdit.toneMode')}</option>
              <option value="None">None</option><option value="Tone">Tone</option><option value="TSQL">TSQL</option><option value="DTCS">DTCS</option><option value="Cross">Cross</option>
            </select>
            <select className="text-xs font-medium text-w-fg bg-w-bg-elev border border-w-border rounded-theme-sm py-1 px-1.5 cursor-pointer"
              onChange={(e) => { if(e.target.value) { handleBulkEdit('duplex', e.target.value); e.target.value = ''; } }} defaultValue="">
              <option value="" disabled>{t('grid.bulkEdit.duplex')}</option>
              <option value="None">None</option><option value="+">+</option><option value="-">-</option><option value="Split">Split</option>
            </select>
          </div>
        )}
      </div>

      {/* Channel detail panel */}
      {expandedChannel && (
        <ChannelDetail
          channel={expandedChannel}
          onSave={(updated) => {
            const newRowData = rowData.map(r => r.index === updated.index ? updated : r);
            setRowData(newRowData);
            if (onDataChanged) onDataChanged(newRowData);
            setExpandedChannel(null);
          }}
          onDiscard={() => setExpandedChannel(null)}
        />
      )}

      {/* Grid container */}
      <div className="flex-1 min-w-[1280px] w-full min-h-0 bg-w-bg-elev transition-colors duration-300">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs as any}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
          rowHeight={32}
          headerHeight={34}
          theme={gridTheme}
          isExternalFilterPresent={() => activeZone !== 0}
          doesExternalFilterPass={(node) => {
            if (!node.data) return true;
            const idx = node.data.index;
            if (activeZone === 1) return idx >= 1 && idx <= 32;
            if (activeZone === 2) return idx >= 33 && idx <= 64;
            if (activeZone === 3) return idx >= 65 && idx <= 96;
            if (activeZone === 4) return idx >= 97 && idx <= 128;
            return true;
          }}
          onRowDoubleClicked={(e) => {
            if (e.data) setExpandedChannel({ ...e.data });
          }}
          enableBrowserTooltips={true}
          stopEditingWhenCellsLoseFocus={true}
          suppressCopyRowsToClipboard={true}
          onSelectionChanged={(params) => {
             setSelectedCount(params.api.getSelectedNodes().length);
          }}
          onCellKeyDown={async (e) => {
            const ev = e.event as KeyboardEvent;
            
            // Multi-copy (Ctrl+C / Cmd+C)
            if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'c') {
               ev.preventDefault();
               if (!gridRef.current) return;
               const nodes = gridRef.current.api.getSelectedNodes();
               if (nodes.length === 0) return;
               
               // Formatem com Excel (separat per Tabs) per retro-compatibilitat amb el Paste existent
               const csvRows = nodes.map(node => {
                 const d = node.data;
                 return [
                   d.index, d.frequency, d.name, d.toneMode, d.tone, 
                   d.toneSql, d.dtcsCode, d.rxDtcsCode, d.dtcsPolarity, 
                   d.duplex, d.offset, d.mode, d.power, d.skip ? "True" : "False"
                 ].join('\t');
               }).join('\n');
               
               try {
                 await navigator.clipboard.writeText(csvRows);
                 console.log("Copiat a l'apapapers success!");
               } catch (err) {
                 console.error("Error al copiar al portapapers", err);
               }
               return;
            }

            // Native Multiple Row Clear
            if (ev.key === 'Backspace') {
               ev.preventDefault();
               handleClearSelected();
            }

            // Native Multiple Row Delete
            if (ev.key === 'Delete') {
               ev.preventDefault();
               handleDeleteSelected();
            }
          }}
          onGridReady={(params) => {
            params.api.sizeColumnsToFit();
          }}
          onGridSizeChanged={(params) => {
            params.api.sizeColumnsToFit();
          }}
          onCellValueChanged={(params) => {
             // Actualitzem les dades arrel global quan l'usuari fa edicions cel·la a cel·la
             const newRowData: MemoryChannel[] = [];
             params.api.forEachNode(node => {
               if (node.data) newRowData.push(node.data);
             });
             setRowData(newRowData);
             if (onDataChanged) onDataChanged(newRowData);
           }}
         />
       </div>

       {/* RepeaterBook Modal */}
       {rbModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-w-bg-elev p-6 rounded-theme-xl shadow-card w-full max-w-md border border-w-border animate-in fade-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold flex items-center gap-2 text-w-fg">
                 <Globe className="w-6 h-6 text-w-accent" />
                 RepeaterBook
               </h3>
               <button onClick={() => setRbModalOpen(false)} className="text-w-fg-faint hover:text-w-fg transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <p className="text-sm text-w-fg-mute mb-6 font-medium">
               Import nearby open repeaters for your area without manual lookups. Currently covers Spain and Europe.
             </p>

             <form onSubmit={(e) => {
               e.preventDefault();
               const fd = new FormData(e.currentTarget);
               handleFetchRepeaterBook(
                 fd.get('country') as string,
                 fd.get('state') as string,
                 fd.get('band') as 'ALL' | 'VHF' | 'UHF',
                 userCoords?.lat,
                 userCoords?.lon
               );
             }} className="flex flex-col gap-4">
               <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-w-fg-mute mb-1 block font-mono">
                   País (Anglès)
                 </label>
                 <select
                   name="country"
                   value={rbCountry}
                   onChange={(e) => setRbCountry(e.target.value)}
                   className="w-full bg-w-bg-sunken border border-w-border rounded-theme-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-w-accent outline-none text-w-fg"
                 >
                   <option value="Spain">Spain</option>
                   <option value="Andorra">Andorra</option>
                   <option value="France">France</option>
                   <option value="United Kingdom">United Kingdom</option>
                   <option value="Germany">Germany</option>
                 </select>
               </div>
               <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-w-fg-mute mb-1 block font-mono">
                   Província / Comunitat
                 </label>
                 {rbCountry === 'Spain' ? (
                   <select
                     name="state"
                     defaultValue="Catalonia"
                     className="w-full bg-w-bg-sunken border border-w-border rounded-theme-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-w-accent outline-none text-w-fg"
                   >
                     <option value="Andalusia">Andalusia</option>
                     <option value="Aragon">Aragon</option>
                     <option value="Asturias">Asturias</option>
                     <option value="Balearic Islands">Balearic Islands</option>
                     <option value="Basque Country">Basque Country</option>
                     <option value="Canary Islands">Canary Islands</option>
                     <option value="Cantabria">Cantabria</option>
                     <option value="Castile and Leon">Castile and Leon</option>
                     <option value="Castilla-La Mancha">Castilla-La Mancha</option>
                     <option value="Catalonia">Catalonia</option>
                     <option value="Extremadura">Extremadura</option>
                     <option value="Galicia">Galicia</option>
                     <option value="La Rioja">La Rioja</option>
                     <option value="Madrid">Madrid</option>
                     <option value="Murcia">Murcia</option>
                     <option value="Navarre">Navarre</option>
                     <option value="Valencia">Valencia</option>
                     <option value="Ceuta">Ceuta</option>
                     <option value="Melilla">Melilla</option>
                   </select>
                 ) : (
                   <input
                     required
                     name="state"
                     defaultValue=""
                     placeholder="In English, e.g. Île-de-France..."
                     className="w-full bg-w-bg-sunken border border-w-border rounded-theme-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-w-accent outline-none text-w-fg placeholder:text-w-fg-faint"
                   />
                 )}
               </div>

               <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-w-fg-mute mb-1 block font-mono">
                   Band / Frequency
                 </label>
                 <select name="band" defaultValue="ALL" className="w-full bg-w-bg-sunken border border-w-border rounded-theme-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-w-accent outline-none text-w-fg">
                   <option value="ALL">All bands (VHF + UHF)</option>
                   <option value="VHF">VHF only (2 Metres)</option>
                   <option value="UHF">UHF only (70 Centimetres)</option>
                 </select>
               </div>

               <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-w-fg-mute mb-1 block font-mono">
                   Proximity (Optional)
                 </label>
                 <div className="flex items-center justify-between bg-w-bg-sunken border border-w-border rounded-theme-md px-3 py-2">
                   <span className="text-sm font-medium text-w-fg-soft">
                     {userCoords ? `Lat: ${userCoords.lat.toFixed(2)}, Lon: ${userCoords.lon.toFixed(2)}` : "Sort by distance"}
                   </span>

                   {!userCoords ? (
                     <button
                       type="button"
                       onClick={() => {
                         if (navigator.geolocation) {
                           navigator.geolocation.getCurrentPosition(
                             (pos) => setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                             () => toast.error(t('grid.alerts.locationFailed', {
                               defaultValue: 'Could not obtain location. Check permissions.'
                             }))
                           );
                         }
                       }}
                       className="text-xs font-bold bg-w-bg-hover text-w-fg-soft px-3 py-1.5 rounded-theme-sm hover:bg-w-border transition-colors"
                     >
                       Locate me
                     </button>
                   ) : (
                     <button
                       type="button"
                       onClick={() => setUserCoords(null)}
                       className="text-xs font-bold text-sig-red hover:opacity-80 transition-colors"
                     >
                       Discard
                     </button>
                   )}
                 </div>
                 {userCoords && <p className="text-[10px] text-sig-green mt-1">Repeaters will be sorted from nearest to farthest!</p>}
               </div>

               <div className="mt-2">
                 <button
                   type="submit"
                   disabled={isRbLoading}
                   className="w-full bg-w-accent hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-theme-lg transition-all shadow-card flex items-center justify-center gap-2"
                 >
                   {isRbLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
                   {isRbLoading ? "Descarregant API..." : "Cercar i Importar"}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

     </div>
   );
 }
