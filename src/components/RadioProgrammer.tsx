import { useState } from 'react';
import { SerialConnection } from '../lib/serial';
import { getDriverClass } from '../lib/drivers';
import type { MemoryChannel, GlobalSettings, IRadioDriver } from '../lib/types';
import { Cable, DownloadCloud, UploadCloud, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { Button } from './ui/Button';

export function RadioProgrammer({
  channels,
  settings,
  rawBuffer,
  selectedDriverId,
  onDataLoaded,
  onWriteSuccess
}: {
  channels?: MemoryChannel[],
  settings?: GlobalSettings,
  rawBuffer?: Uint8Array | null,
  selectedDriverId: string,
  onDataLoaded?: (channels: MemoryChannel[], settings: GlobalSettings, raw: Uint8Array) => void,
  onWriteSuccess?: () => void
}) {
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED' | 'READING' | 'WRITING' | 'ERROR'>('IDLE');
  const [progress, setProgress] = useState(0);
  const { t } = useTranslation();
  const toast = useToast();

  // Store the driver instance in state once connected
  const [radio, setRadio] = useState<IRadioDriver | null>(null);

  const handleConnect = async () => {
    try {
      setStatus('CONNECTING');

      const driverClass = getDriverClass(selectedDriverId);
      if (!driverClass) {
        throw new Error("No radio driver found for the selected model");
      }

      const conn = new SerialConnection();
      const granted = await conn.requestPort();
      if (!granted) {
        setStatus('IDLE');
        return;
      }

      const instance = new driverClass(conn);
      setRadio(instance);
      setStatus('CONNECTED');
      toast.success(t('radio.alerts.connected', { defaultValue: 'Connected successfully!' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t('radio.errors.connect', { defaultValue: 'Error connecting: {{error}}', error: errorMessage }));
      setStatus('ERROR');
    }
  };

  const handleRead = async () => {
    if (!radio) return;
    setStatus('READING');
    setProgress(0);

    try {
      await radio.connect();
      const data = await radio.readFromRadio((p: number) => setProgress(p));
      console.log('Raw data downloaded (byte map):', data);

      // Decode the binary buffer into human-readable channel objects
      const parsedChannels = radio.decodeChannels(data);
      const parsedSettings = radio.decodeGlobalSettings(data);
      if (onDataLoaded) onDataLoaded(parsedChannels, parsedSettings, data);

      setStatus('CONNECTED');
      toast.success(t('radio.alerts.readSuccess', { defaultValue: 'Data read successfully!' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t('radio.errors.read', { defaultValue: 'Error reading: {{error}}', error: errorMessage }));
      setStatus('ERROR');
    } finally {
      await radio.disconnect();
    }
  };

  const handleWrite = async () => {
    if (!radio) return;
    if (!rawBuffer || !channels) {
      toast.error(t('radio.errors.noMemory'));
      return;
    }
    setStatus('WRITING');
    setProgress(0);

    try {
      await radio.connect();
      console.log("Channels ready to write:", channels);
      const tempBuffer = new Uint8Array(rawBuffer);
      const withSettings = radio.encodeGlobalSettings(settings || {}, tempBuffer);
      const outBuffer = radio.encodeChannels(channels, withSettings);

      console.log("Output buffer length:", outBuffer.byteLength);
      await radio.writeToRadio(outBuffer, (p: number) => setProgress(p));
      console.log(t('radio.logs.writeSuccess'));
      if (onWriteSuccess) onWriteSuccess();
      setStatus('CONNECTED');
      toast.success(t('radio.alerts.writeSuccess', { defaultValue: 'Data written successfully!' }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t('radio.errors.write', { defaultValue: 'Error writing: {{error}}', error: errorMessage }));
      setStatus('ERROR');
    } finally {
      await radio.disconnect();
    }
  };

  const isBusy = status === 'READING' || status === 'WRITING';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-xl dark:shadow-slate-950/60 border border-slate-200 dark:border-slate-800 p-6 md:p-8 w-full max-w-xl transition-all duration-300">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{t('radio.panelTitle')}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('radio.panelSubtitle')}</p>
        </div>

        {/* Status indicator */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm border transition-colors ${
          status === 'CONNECTED' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' :
          status === 'ERROR' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' :
          isBusy ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' :
          status === 'CONNECTING' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' :
          'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        }`}>
          <span className="relative flex h-2 w-2 shrink-0">
            {(isBusy || status === 'CONNECTING') && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'CONNECTING' ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              status === 'CONNECTED' ? 'bg-emerald-500' :
              status === 'ERROR' ? 'bg-red-500' :
              isBusy ? 'bg-blue-500' :
              status === 'CONNECTING' ? 'bg-amber-400' :
              'bg-slate-400'
            }`} />
          </span>
          {status === 'ERROR' && <AlertCircle className="w-3.5 h-3.5"/>}
          {t(`radio.status.${status.toLowerCase()}`)}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {(status === 'IDLE' || status === 'ERROR') ? (
          <Button variant="primary" size="lg" fullWidth onClick={handleConnect}>
            <Cable className="w-5 h-5" />
            {t('radio.buttons.connect')}
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleRead}
              disabled={isBusy}
            >
              <DownloadCloud className="w-5 h-5" />
              {status === 'READING' ? t('radio.buttons.reading') : t('radio.buttons.read')}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleWrite}
              disabled={isBusy}
            >
              <UploadCloud className="w-5 h-5" />
              {status === 'WRITING' ? t('radio.buttons.writing') : t('radio.buttons.write')}
            </Button>
          </div>
        )}
      </div>

      {isBusy && (
        <div className="mt-8 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            <span>{status === 'READING' ? t('radio.progress.reading') : t('radio.progress.writing')}</span>
            <span className="text-blue-600 dark:text-blue-400 font-black">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
        </div>
      )}

      {status === 'CONNECTED' && (
         <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400 bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-100 dark:border-sky-900/50 shadow-sm">
           <p className="font-medium text-sky-800 dark:text-sky-300 mb-1">{t('radio.ready.title')}</p>
           <p className="text-sky-600/80 dark:text-sky-400/80">{t('radio.ready.description')}</p>
         </div>
      )}
    </div>
  );
}
