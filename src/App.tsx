import { useState, useRef, useEffect } from 'react';
import { RadioProgrammer } from './components/RadioProgrammer';
import { MemoryGrid } from './components/MemoryGrid';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_RADIOS, getDriverClass } from './lib/drivers';
import type { MemoryChannel, GlobalSettings, SettingDef } from './lib/types';
import { defaultChannels } from './lib/types';
import { GlobalSettingsView } from './components/GlobalSettings';
import { useToast } from './hooks/useToast';
import { RepositoryPage } from './repository/RepositoryPage';
import { Sidebar } from './components/Sidebar';
import { detectRadioFromImg, MODEL_TO_DRIVER_ID } from './lib/imgDetection';
import { decodeRT4D } from './lib/drivers/rt4d';
import { AlertTriangle, X, Radio, Cable } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

type Tab = 'memory' | 'settings' | 'repository'

function App() {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('memory');
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  type DriverMismatch = { file: File; detectedDriverId: string; detectedModel: string }
  const [driverMismatch, setDriverMismatch] = useState<DriverMismatch | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
    <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950 selection:bg-blue-100 dark:selection:bg-blue-900 transition-colors duration-300">

      {/* Background blobs */}
      <div className="fixed top-[-10%] right-[-5%] w-96 h-96 bg-blue-400/15 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[20%] w-96 h-96 bg-indigo-400/15 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

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
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
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

        {/* Active radio bar */}
        {activeTab !== 'repository' && (
          <div className="shrink-0 flex items-center gap-3 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {SUPPORTED_RADIOS.find(r => r.id === selectedDriverId)?.name ?? selectedDriverId}
            </span>
            <div className="flex items-center gap-2 ml-1">
              {rawBuffer ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {t('app.radioBar.fileLoaded')}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {t('app.radioBar.noFile')}
                </span>
              )}
              {isDirty && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {t('app.radioBar.unsaved')}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowConnectionPanel(p => !p)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                showConnectionPanel
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Cable className="w-3.5 h-3.5" />
              {t('app.tabs.usb')}
            </button>
          </div>
        )}
        {activeTab === 'settings' ? (
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
        ) : activeTab === 'repository' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <RepositoryPage
              isDarkMode={isDarkMode}
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
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </main>

      {/* Connection drawer backdrop */}
      {showConnectionPanel && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setShowConnectionPanel(false)}
        />
      )}

      {/* Connection drawer */}
      <div className={`fixed right-0 top-0 h-full z-50 w-full max-w-sm flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/70 transition-transform duration-300 ease-in-out ${showConnectionPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Cable className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {t('app.tabs.usb')}
          </h2>
          <button
            onClick={() => setShowConnectionPanel(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/70 p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {t('app.driverMismatch.title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('app.driverMismatch.message', {
                    detected: driverMismatch.detectedModel,
                    current: SUPPORTED_RADIOS.find(r => r.id === selectedDriverId)?.name ?? selectedDriverId,
                  })}
                </p>
              </div>
              <button onClick={() => setDriverMismatch(null)} className="ml-auto p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDriverMismatch(null)}
                className="px-4 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('app.driverMismatch.cancel')}
              </button>
              <button
                onClick={() => {
                  const m = driverMismatch;
                  setDriverMismatch(null);
                  processImgFile(m.file, m.detectedDriverId);
                }}
                className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
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
