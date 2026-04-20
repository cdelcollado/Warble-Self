import { useState, useRef, useEffect } from 'react';
import { RadioProgrammer } from './components/RadioProgrammer';
import { MemoryGrid } from './components/MemoryGrid';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_RADIOS, getDriverClass } from './lib/drivers';
import type { MemoryChannel, GlobalSettings, SettingDef } from './lib/types';
import { defaultChannels } from './lib/types';
import { GlobalSettingsView } from './components/GlobalSettings';
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { RepositoryPage } from './repository/RepositoryPage';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './components/LandingPage';
import { RepeaterBookPage } from './components/RepeaterBookPage';
import { detectRadioFromImg, MODEL_TO_DRIVER_ID } from './lib/imgDetection';
import { decodeRT4D } from './lib/drivers/rt4d';
import { AlertTriangle, X, Cable, ChevronRight } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

type Tab = 'home' | 'memory' | 'settings' | 'repeaterbook' | 'repository'

function App() {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);

  const [channels, setChannels] = useState<MemoryChannel[]>(defaultChannels);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({});
  const [selectedDriverId, setSelectedDriverId] = useState<string>(SUPPORTED_RADIOS[0].id);

  const activeDriverClass = getDriverClass(selectedDriverId);
  const [settingsSchema, setSettingsSchema] = useState<SettingDef[]>(
    activeDriverClass ? new activeDriverClass(null as any).getGlobalSettingsSchema() : []
  );
  const [frequencyLimits, setFrequencyLimits] = useState<{ min: number; max: number }[]>(
    activeDriverClass ? new activeDriverClass(null as any).getFrequencyLimits() : []
  );

  const channelCount = SUPPORTED_RADIOS.find(r => r.id === selectedDriverId)?.channelCount ?? 128;

  const [rawBuffer, setRawBuffer] = useState<Uint8Array | null>(null);
  const { isDark } = useTheme();
  const [isDirty, setIsDirty] = useState(false);

  type DriverMismatch = { file: File; detectedDriverId: string; detectedModel: string }
  const [driverMismatch, setDriverMismatch] = useState<DriverMismatch | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleDriverChange = (newId: string) => {
    setSelectedDriverId(newId);
    const DriverCls = getDriverClass(newId);
    if (DriverCls) {
      const instance = new DriverCls(null as any);
      setSettingsSchema(instance.getGlobalSettingsSchema());
      setFrequencyLimits(instance.getFrequencyLimits());
    }
  };

  const processImgFile = (file: File, driverIdOverride?: string) => {
    const driverId = driverIdOverride ?? selectedDriverId;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
      try {
        const driverClass = getDriverClass(driverId);
        if (!driverClass) throw new Error("Driver not available");
        const driverInstance = new driverClass(null as any);
        const parsedChannels = driverInstance.decodeChannels(buffer);
        const parsedSettings = driverInstance.decodeGlobalSettings(buffer);
        if (driverIdOverride) handleDriverChange(driverIdOverride);
        setChannels(parsedChannels);
        setGlobalSettings(parsedSettings);
        setRawBuffer(buffer);
        setIsDirty(true);
        toast.success(t('app.alerts.importSuccess', { count: parsedChannels.length, filename: file.name }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(t('app.alerts.importError', { error: errorMessage }));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.ddmr')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
        try {
          const parsedChannels = decodeRT4D(buffer);
          handleDriverChange('rt4d');
          setChannels(parsedChannels);
          setRawBuffer(buffer);
          setIsDirty(true);
          toast.success(t('app.alerts.importSuccess', { count: parsedChannels.length, filename: file.name }));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          toast.error(t('app.alerts.importError', { error: errorMessage }));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (file.name.toLowerCase().endsWith('.img')) {
      detectRadioFromImg(file).then(detected => {
        const detectedDriverId = detected ? MODEL_TO_DRIVER_ID[detected.model] : null;
        if (detectedDriverId && detectedDriverId !== selectedDriverId) {
          setDriverMismatch({ file, detectedDriverId, detectedModel: `${detected!.brand} ${detected!.model}` });
        } else {
          processImgFile(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result;
      if (!result) return;

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = result as string;
        const rows = text.split('\n').filter(r => r.trim() !== '');
        const newChannels: MemoryChannel[] = [];

        rows.forEach((row, idx) => {
          if (idx === 0 && row.toLowerCase().includes('location')) return;
          const separator = row.includes('\t') ? '\t' : ',';
          const cols = row.split(separator);
          if (cols.length < 2) return;

          newChannels.push({
            index: parseInt(cols[0]) || channels.length + idx + 1,
            name: cols[1] || "",
            frequency: cols[2] || "145.000000",
            duplex: cols[3] as any || "None",
            offset: cols[4] || "0.000000",
            toneMode: cols[5] as any || "None",
            tone: cols[6] || "88.5",
            toneSql: cols[7] || "88.5",
            dtcsCode: cols[8] || "023",
            rxDtcsCode: cols[8] || "023",
            dtcsPolarity: cols[9] as any || "NN",
            mode: cols[10] as any || "FM",
            power: "High",
            skip: cols[12] ? cols[12].toLowerCase() === 's' : false
          });
        });

        if (newChannels.length > 0) {
          setChannels(newChannels);
          setIsDirty(true);
          toast.success(t('app.alerts.importSuccess', { count: newChannels.length, filename: file.name }));
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const handleSaveImg = () => {
    if (!rawBuffer) {
      toast.error(t('app.alerts.noBuffer', { defaultValue: 'No raw buffer. Read from Radio or Open a .img first.' }));
      return;
    }
    try {
      const driverClass = getDriverClass(selectedDriverId);
      if (!driverClass) throw new Error("Driver not available");

      const driverInstance = new driverClass(null as any);
      const tempBuffer = new Uint8Array(rawBuffer);
      const withSettings = driverInstance.encodeGlobalSettings(globalSettings, tempBuffer);
      const outBuffer = driverInstance.encodeChannels(channels, withSettings);
      const blob = new Blob([outBuffer as unknown as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "warble_image.img");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDirty(false);
      toast.success(t('app.alerts.saveSuccess', { defaultValue: 'Image saved successfully!' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(t('app.alerts.importError', { error: errorMessage }));
    }
  };

  const handleSaveCSV = () => {
    if (channels.length === 0) return;
    let csv = "Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode,TStep,Skip,Comment,URCALL,RPT1CALL,RPT2CALL,DVCODE\n";
    channels.forEach(row => {
      csv += `${row.index},${row.name},${row.frequency},${row.duplex},${row.offset},${row.toneMode},${row.tone},${row.toneSql},${row.dtcsCode},${row.dtcsPolarity},${row.mode},5.00,${row.skip ? 'S' : ''},,,,,\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'warble_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-w-bg selection:bg-w-accent-soft transition-colors duration-300">

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".img,.csv,.ddmr"
        className="hidden"
      />

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedDriverId={selectedDriverId}
        onDriverChange={handleDriverChange}
        rawBuffer={rawBuffer}
        onOpenFile={() => fileInputRef.current?.click()}
        onSaveImg={handleSaveImg}
        onSaveCSV={handleSaveCSV}
        onRequestWrite={() => setShowConnectionPanel(true)}
        isDirty={isDirty}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Breadcrumb bar */}
        <div className="shrink-0 flex items-center gap-1.5 px-5 py-2 border-b border-w-border bg-w-bg-elev/80 backdrop-blur-sm text-xs">
          {/* Status */}
          <span className="flex items-center gap-1.5 font-semibold text-w-fg-soft">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rawBuffer ? 'bg-sig-green' : 'bg-w-fg-faint'}`} />
            {t('app.breadcrumb.ready')}
          </span>
          <ChevronRight className="w-3 h-3 text-w-fg-faint shrink-0" />

          {/* Radio model */}
          <span className="font-bold text-w-accent-fg">
            {SUPPORTED_RADIOS.find(r => r.id === selectedDriverId)?.name ?? selectedDriverId}
          </span>
          <ChevronRight className="w-3 h-3 text-w-fg-faint shrink-0" />

          {/* Codeplug */}
          <span className="font-medium text-w-fg-mute">{t('app.breadcrumb.codeplug')}</span>
          <ChevronRight className="w-3 h-3 text-w-fg-faint shrink-0" />

          {/* Filename / untitled */}
          <span className="font-medium text-w-fg-soft">{t('app.breadcrumb.untitled')}</span>

          {/* Saved/unsaved indicator */}
          <span className="flex items-center gap-1 ml-0.5">
            <span className="text-w-fg-faint">•</span>
            {isDirty ? (
              <span className="flex items-center gap-1 font-medium text-sig-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-sig-amber shrink-0" />
                {t('app.breadcrumb.unsaved')}
              </span>
            ) : (
              <span className="font-medium text-w-fg-faint">{t('app.breadcrumb.saved')}</span>
            )}
          </span>

          {/* Connect radio button */}
          <button
            onClick={() => setShowConnectionPanel(p => !p)}
            className={`ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-theme-md text-xs font-bold border transition-colors ${
              showConnectionPanel
                ? 'bg-w-accent text-white border-w-accent shadow-sm'
                : 'border-w-border text-w-fg-soft hover:bg-w-bg-hover'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            {t('app.breadcrumb.connectRadio')}
          </button>
        </div>
        {activeTab === 'home' ? (
          <LandingPage
            radioName={SUPPORTED_RADIOS.find(r => r.id === selectedDriverId)?.name ?? selectedDriverId}
            channelCount={channelCount}
            onConnectRadio={() => setShowConnectionPanel(true)}
            onOpenFile={() => fileInputRef.current?.click()}
            onImportRepository={() => setActiveTab('repository')}
            onStartBlank={() => {
              setChannels(defaultChannels);
              setIsDirty(true);
              setActiveTab('memory');
            }}
          />
        ) : activeTab === 'settings' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <GlobalSettingsView
              schema={settingsSchema}
              settings={globalSettings}
              onChange={(key, val) => {
                setGlobalSettings(prev => ({ ...prev, [key]: val }));
                setIsDirty(true);
              }}
            />
          </div>
        ) : activeTab === 'repeaterbook' ? (
          <RepeaterBookPage
            onAddChannels={(newChannels) => {
              const presentIndexes = channels.map(r => r.index);
              const nextId = presentIndexes.length > 0 ? Math.max(...presentIndexes) + 1 : 1;
              const assigned = newChannels.map((ch, i) => ({ ...ch, index: nextId + i }));
              setChannels(prev => [...prev, ...assigned].sort((a, b) => a.index - b.index));
              setIsDirty(true);
            }}
          />
        ) : activeTab === 'repository' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <RepositoryPage
              isDarkMode={isDark}
              onLoadToEditor={(newChannels, model) => {
                const detectedDriverId = MODEL_TO_DRIVER_ID[model];
                if (detectedDriverId && detectedDriverId !== selectedDriverId) {
                  handleDriverChange(detectedDriverId);
                }
                setChannels(newChannels);
                setIsDirty(true);
                setActiveTab('memory');
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <MemoryGrid
              data={channels}
              limits={frequencyLimits}
              channelCount={channelCount}
              onDataChanged={(newData) => {
                setChannels(newData);
                setIsDirty(true);
              }}
              isDarkMode={isDark}
            />
          </div>
        )}
        {/* Bottom status bar */}
        <div className="shrink-0 flex items-center gap-4 px-5 py-1.5 border-t border-w-border bg-w-bg-elev/80 text-[11px] font-mono text-w-fg-faint">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-w-fg-soft">{channels.length}</span>
            <span>/</span>
            <span>{channelCount}</span>
          </span>
          {frequencyLimits.length > 0 && (
            <>
              <span className="text-w-border">|</span>
              {frequencyLimits.map((l, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>{l.min}</span>
                  <span className="text-w-fg-faint">–</span>
                  <span>{l.max}</span>
                  {i < frequencyLimits.length - 1 && <span className="text-w-border ml-1">·</span>}
                </span>
              ))}
            </>
          )}
          {activeTab === 'memory' && (
            <span className="ml-auto">{isDirty ? t('app.breadcrumb.unsaved') : t('app.breadcrumb.saved')}</span>
          )}
        </div>
      </main>

      {/* Connection drawer backdrop */}
      {showConnectionPanel && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setShowConnectionPanel(false)}
        />
      )}

      {/* Connection drawer */}
      <div className={`fixed right-0 top-0 h-full z-50 w-full max-w-sm flex flex-col bg-w-bg border-l border-w-border shadow-card transition-transform duration-300 ease-in-out ${showConnectionPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-w-border shrink-0">
          <h2 className="text-base font-bold text-w-fg flex items-center gap-2">
            <Cable className="w-4 h-4 text-w-accent" />
            {t('app.tabs.usb')}
          </h2>
          <button
            onClick={() => setShowConnectionPanel(false)}
            className="p-1.5 rounded-theme-md text-w-fg-faint hover:text-w-fg-soft hover:bg-w-bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
          <RadioProgrammer
            channels={channels}
            settings={globalSettings}
            rawBuffer={rawBuffer}
            selectedDriverId={selectedDriverId}
            onDataLoaded={(c, s, raw) => {
              setChannels(c);
              setGlobalSettings(s);
              setRawBuffer(raw);
              setIsDirty(false);
              setShowConnectionPanel(false);
            }}
            onWriteSuccess={() => {
              setIsDirty(false);
              setShowConnectionPanel(false);
            }}
          />
        </div>
      </div>

      {/* Driver Mismatch Modal */}
      {driverMismatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-w-bg-elev rounded-theme-xl shadow-card p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-sig-amber shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-w-fg">
                  {t('app.driverMismatch.title')}
                </h3>
                <p className="text-sm text-w-fg-soft mt-1">
                  {t('app.driverMismatch.message', {
                    detected: driverMismatch.detectedModel,
                    current: SUPPORTED_RADIOS.find(r => r.id === selectedDriverId)?.name ?? selectedDriverId,
                  })}
                </p>
              </div>
              <button onClick={() => setDriverMismatch(null)} className="ml-auto p-1 text-w-fg-faint hover:text-w-fg-soft">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDriverMismatch(null)}
                className="px-4 py-2 text-sm rounded-theme-xl text-w-fg-soft hover:bg-w-bg-hover transition-colors"
              >
                {t('app.driverMismatch.cancel')}
              </button>
              <button
                onClick={() => {
                  const m = driverMismatch;
                  setDriverMismatch(null);
                  processImgFile(m.file, m.detectedDriverId);
                }}
                className="px-4 py-2 text-sm rounded-theme-xl bg-w-accent hover:brightness-110 text-white font-semibold transition-colors"
              >
                {t('app.driverMismatch.switchAndLoad', { model: driverMismatch.detectedModel })}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster
        toastOptions={{
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-text)',
          },
        }}
      />
    </div>
  );
}

export default App;
