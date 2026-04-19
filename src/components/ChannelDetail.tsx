import { useState } from 'react';
import { X, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MemoryChannel } from '../lib/types';

type Tab = 'basics' | 'tones' | 'dtmf' | 'power' | 'notes';

interface ChannelDetailProps {
  channel: MemoryChannel;
  onSave: (updated: MemoryChannel) => void;
  onDiscard: () => void;
}

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'basics', labelKey: 'channelDetail.tabs.basics' },
  { id: 'tones', labelKey: 'channelDetail.tabs.tones' },
  { id: 'dtmf', labelKey: 'channelDetail.tabs.dtmf' },
  { id: 'power', labelKey: 'channelDetail.tabs.power' },
  { id: 'notes', labelKey: 'channelDetail.tabs.notes' },
];

export function ChannelDetail({ channel, onSave, onDiscard }: ChannelDetailProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('basics');
  const [draft, setDraft] = useState<MemoryChannel>({ ...channel });

  const update = (field: keyof MemoryChannel, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const stepFrequency = (delta: number) => {
    const freq = parseFloat(draft.frequency || '0');
    if (isNaN(freq)) return;
    update('frequency', (freq + delta).toFixed(6));
  };

  const fieldLabel = (text: string) => (
    <span className="text-[10px] font-bold uppercase tracking-widest text-w-fg-faint font-mono">{text}</span>
  );

  const inputClass = "w-full bg-w-bg border border-w-border text-sm text-w-fg rounded-theme-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-w-accent font-mono";
  const selectClass = "bg-w-bg border border-w-border text-sm text-w-fg rounded-theme-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-w-accent cursor-pointer";

  return (
    <div className="border-b border-w-border bg-w-bg-elev shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-w-border-soft">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-w-fg-faint">#{draft.index}</span>
          <span className="text-sm font-bold text-w-fg">{draft.name || t('channelDetail.unnamed')}</span>
          <span className="text-xs font-mono text-w-accent-fg">{draft.frequency ? `${draft.frequency} MHz` : '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onDiscard}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-w-fg-mute hover:text-w-fg-soft hover:bg-w-bg-hover rounded-theme-md transition-colors">
            <X className="w-3.5 h-3.5" /> {t('channelDetail.discard')}
          </button>
          <button onClick={() => onSave(draft)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-w-accent hover:brightness-110 rounded-theme-md transition-colors">
            <Check className="w-3.5 h-3.5" /> {t('channelDetail.save')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-w-border-soft px-4">
        {TABS.map(({ id, labelKey }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === id
                ? 'border-w-accent text-w-accent-fg'
                : 'border-transparent text-w-fg-mute hover:text-w-fg-soft'
            }`}>
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-3">
        {tab === 'basics' && (
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-1.5 w-48">
              {fieldLabel(t('channelDetail.fields.name'))}
              <input type="text" value={draft.name || ''} onChange={(e) => update('name', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.frequency'))}
              <div className="flex items-center gap-1">
                <button onClick={() => stepFrequency(-0.0125)} className="p-1 rounded-theme-sm border border-w-border hover:bg-w-bg-hover text-w-fg-mute">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <input type="text" value={draft.frequency || ''} onChange={(e) => update('frequency', e.target.value)}
                  className={`${inputClass} w-36 text-center`} />
                <button onClick={() => stepFrequency(0.0125)} className="p-1 rounded-theme-sm border border-w-border hover:bg-w-bg-hover text-w-fg-mute">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.duplex'))}
              <select value={draft.duplex || 'None'} onChange={(e) => update('duplex', e.target.value)} className={selectClass}>
                <option value="None">None</option>
                <option value="+">+</option>
                <option value="-">-</option>
                <option value="Split">Split</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-36">
              {fieldLabel(t('channelDetail.fields.offset'))}
              <input type="text" value={draft.offset || ''} onChange={(e) => update('offset', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.mode'))}
              <select value={draft.mode || 'FM'} onChange={(e) => update('mode', e.target.value)} className={selectClass}>
                <option value="FM">FM</option>
                <option value="NFM">NFM</option>
                <option value="AM">AM</option>
              </select>
            </div>
          </div>
        )}

        {tab === 'tones' && (
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.toneMode'))}
              <select value={draft.toneMode || 'None'} onChange={(e) => update('toneMode', e.target.value)} className={selectClass}>
                <option value="None">None</option>
                <option value="Tone">Tone</option>
                <option value="TSQL">TSQL</option>
                <option value="DTCS">DTCS</option>
                <option value="Cross">Cross</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-28">
              {fieldLabel(t('channelDetail.fields.tone'))}
              <input type="text" value={draft.tone || ''} onChange={(e) => update('tone', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5 w-28">
              {fieldLabel(t('channelDetail.fields.toneSql'))}
              <input type="text" value={draft.toneSql || ''} onChange={(e) => update('toneSql', e.target.value)} className={inputClass} />
            </div>
          </div>
        )}

        {tab === 'dtmf' && (
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-1.5 w-28">
              {fieldLabel(t('channelDetail.fields.dtcsCode'))}
              <input type="text" value={draft.dtcsCode || ''} onChange={(e) => update('dtcsCode', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5 w-28">
              {fieldLabel(t('channelDetail.fields.rxDtcsCode'))}
              <input type="text" value={draft.rxDtcsCode || ''} onChange={(e) => update('rxDtcsCode', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.dtcsPolarity'))}
              <select value={draft.dtcsPolarity || 'NN'} onChange={(e) => update('dtcsPolarity', e.target.value)} className={selectClass}>
                <option value="NN">NN</option>
                <option value="NR">NR</option>
                <option value="RN">RN</option>
                <option value="RR">RR</option>
              </select>
            </div>
          </div>
        )}

        {tab === 'power' && (
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.power'))}
              <select value={draft.power || 'High'} onChange={(e) => update('power', e.target.value)} className={selectClass}>
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              {fieldLabel(t('channelDetail.fields.skip'))}
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" checked={!!draft.skip} onChange={(e) => update('skip', e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--w-accent)]" />
                <span className="text-xs text-w-fg-soft">{draft.skip ? t('channelDetail.skipYes') : t('channelDetail.skipNo')}</span>
              </label>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <p className="text-xs text-w-fg-mute italic">{t('channelDetail.notesPlaceholder')}</p>
        )}
      </div>
    </div>
  );
}
