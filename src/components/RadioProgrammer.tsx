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
    <div className="bg-w-bg-elev rounded-theme-xl shadow-card border border-w-border p-6 md:p-8 w-full max-w-xl transition-all duration-300">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-w-fg tracking-tight">{t('radio.panelTitle')}</h2>
          <p className="text-sm font-medium text-w-fg-mute">{t('radio.panelSubtitle')}</p>
        </div>

        {/* Status indicator */}
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm border transition-colors font-mono ${
          status === 'CONNECTED' ? 'bg-w-bg-sunken text-sig-green border-w-border' :
          status === 'ERROR' ? 'bg-w-bg-sunken text-sig-red border-w-border' :
          isBusy ? 'bg-w-bg-sunken text-w-accent-fg border-w-border' :
          status === 'CONNECTING' ? 'bg-w-bg-sunken text-sig-amber border-w-border' :
          'bg-w-bg-sunken text-w-fg-mute border-w-border'
        }`}>
          <span className="relative flex h-2 w-2 shrink-0">
            {(isBusy || status === 'CONNECTING') && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                status === 'CONNECTING' ? 'bg-sig-amber' : 'bg-w-accent'
              }`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              status === 'CONNECTED' ? 'bg-sig-green' :
              status === 'ERROR' ? 'bg-sig-red' :
              isBusy ? 'bg-w-accent' :
              status === 'CONNECTING' ? 'bg-sig-amber' :
              'bg-w-fg-faint'
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
        <div className="mt-8 p-5 rounded-theme-lg bg-w-bg-sunken border border-w-border-soft">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-w-fg-mute mb-3 font-mono">
            <span>{status === 'READING' ? t('radio.progress.reading') : t('radio.progress.writing')}</span>
            <span className="text-w-accent-fg font-black">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-w-bg rounded-full h-2.5 overflow-hidden shadow-inner border border-w-border-soft">
            <div
              className="h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.max(2, progress)}%`,
                background: `linear-gradient(90deg, var(--w-accent), var(--w-accent-strong))`,
                boxShadow: `0 0 8px color-mix(in srgb, var(--w-accent) 50%, transparent)`
              }}
            />
          </div>
        </div>
      )}

      {status === 'CONNECTED' && (
         <div className="mt-8 text-center text-sm text-w-fg-soft bg-w-accent-soft rounded-theme-lg p-4 border border-w-border shadow-sm">
           <p className="font-medium text-w-accent-fg mb-1">{t('radio.ready.title')}</p>
           <p className="text-w-fg-mute">{t('radio.ready.description')}</p>
         </div>
      )}
    </div>
  );
}
