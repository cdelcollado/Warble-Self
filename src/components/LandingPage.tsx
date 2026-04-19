import { useState, useEffect } from 'react';
import { Cable, FolderOpen, Database, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Waveform } from './Waveform';
import { SUPPORTED_RADIOS } from '../lib/drivers';

interface LandingPageProps {
  radioName: string;
  channelCount: number;
  onConnectRadio: () => void;
  onOpenFile: () => void;
  onImportRepository: () => void;
  onStartBlank: () => void;
}

export function LandingPage({
  radioName,
  channelCount,
  onConnectRadio,
  onOpenFile,
  onImportRepository,
  onStartBlank,
}: LandingPageProps) {
  const { t } = useTranslation();
  const [radioIdx, setRadioIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setRadioIdx(prev => (prev + 1) % SUPPORTED_RADIOS.length);
        setFade(true);
      }, 300);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const displayRadioName = SUPPORTED_RADIOS[radioIdx]?.name ?? radioName;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left side — hero + actions */}
      <div className="flex-1 flex flex-col justify-center px-10 py-8 max-w-2xl">
        {/* Status line */}
        <p className="text-xs font-mono font-semibold text-w-fg-faint uppercase tracking-widest mb-2">
          {t('app.landing.status')}
        </p>

        {/* Hero text */}
        <h2 className="text-4xl md:text-5xl font-black text-w-fg leading-[1.15] tracking-tight font-display mb-6">
          {t('app.landing.heroPrefix')}{' '}
          <span className={`text-w-accent-fg inline-block transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
            {displayRadioName}
          </span>{' '}
          {t('app.landing.heroSuffix')}
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-w-fg-mute leading-relaxed max-w-md mb-10">
          {t('app.landing.subtitle')}
        </p>

        {/* Quick action pills */}
        <div className="flex items-center gap-2 mb-8">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-w-bg-sunken border border-w-border text-w-fg-mute">
            USB
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-w-bg-sunken border border-w-border text-w-fg-mute">
            .IMG
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-w-bg-sunken border border-w-border text-w-fg-mute">
            .CSV
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-w-bg-sunken border border-w-border text-w-fg-mute">
            .DDMR
          </span>
        </div>

        {/* Action cards — 2×2 grid */}
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          {/* Read from radio */}
          <button
            onClick={onConnectRadio}
            className="flex flex-col gap-2 p-4 rounded-theme-lg border-2 border-w-accent bg-w-accent-soft/20 hover:bg-w-accent-soft/40 transition-colors text-left group"
          >
            <Cable className="w-5 h-5 text-w-accent" />
            <span className="text-sm font-bold text-w-fg">{t('app.landing.readRadio')}</span>
            <span className="text-[11px] text-w-fg-mute leading-snug">{t('app.landing.readRadioDesc')}</span>
          </button>

          {/* Open file */}
          <button
            onClick={onOpenFile}
            className="flex flex-col gap-2 p-4 rounded-theme-lg border border-w-border bg-w-bg-elev hover:bg-w-bg-hover transition-colors text-left group"
          >
            <FolderOpen className="w-5 h-5 text-w-fg-mute" />
            <span className="text-sm font-bold text-w-fg">{t('app.landing.openFile')}</span>
            <span className="text-[11px] text-w-fg-mute leading-snug">{t('app.landing.openFileDesc')}</span>
          </button>

          {/* Import repository */}
          <button
            onClick={onImportRepository}
            className="flex flex-col gap-2 p-4 rounded-theme-lg border border-w-border bg-w-bg-elev hover:bg-w-bg-hover transition-colors text-left group"
          >
            <Database className="w-5 h-5 text-w-fg-mute" />
            <span className="text-sm font-bold text-w-fg">{t('app.landing.importRepo')}</span>
            <span className="text-[11px] text-w-fg-mute leading-snug">{t('app.landing.importRepoDesc')}</span>
          </button>

          {/* Start blank */}
          <button
            onClick={onStartBlank}
            className="flex flex-col gap-2 p-4 rounded-theme-lg border border-w-border bg-w-bg-elev hover:bg-w-bg-hover transition-colors text-left group"
          >
            <FileSpreadsheet className="w-5 h-5 text-w-fg-mute" />
            <span className="text-sm font-bold text-w-fg">{t('app.landing.startBlank')}</span>
            <span className="text-[11px] text-w-fg-mute leading-snug">{t('app.landing.startBlankDesc')}</span>
          </button>
        </div>
      </div>

      {/* Right side — waveform */}
      <div className="hidden lg:flex flex-1 flex-col p-6 max-w-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold font-mono text-w-fg-faint uppercase tracking-widest">
            {t('app.landing.waveformTitle')}
          </span>
          <span className="text-[10px] font-mono text-w-fg-faint">{t('app.landing.waveformSubtitle')}</span>
        </div>
        <div className="flex-1 rounded-theme-lg border border-w-border bg-w-bg-elev overflow-hidden">
          <Waveform />
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-w-fg-faint">
          <span>0 / {channelCount}</span>
          <span className="text-w-fg-mute">—</span>
          <span>{channelCount}</span>
        </div>
      </div>
    </div>
  );
}
