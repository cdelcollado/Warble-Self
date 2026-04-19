import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SettingDef, GlobalSettings } from '../lib/types';
import { Settings2 } from 'lucide-react';

interface GlobalSettingsProps {
  schema: SettingDef[];
  settings: GlobalSettings;
  onChange: (key: string, value: any) => void;
}

export function GlobalSettingsView({ schema, settings, onChange }: GlobalSettingsProps) {
  const { t } = useTranslation();

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, def: SettingDef) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = def.default || 0;
    if (def.min !== undefined && val < def.min) val = def.min;
    if (def.max !== undefined && val > def.max) val = def.max;
    onChange(def.id, val);
  };

  const handleBooleanChange = (e: React.ChangeEvent<HTMLInputElement>, def: SettingDef) => {
    onChange(def.id, e.target.checked);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, def: SettingDef) => {
    // Infer whether the original value was a number
    const oVal = def.options?.[0]?.value;
    let selectedVal: any = e.target.value;
    if (typeof oVal === 'number') {
      selectedVal = parseFloat(selectedVal);
    }
    onChange(def.id, selectedVal);
  };

  if (!schema || schema.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-w-fg-mute">
        <Settings2 className="w-12 h-12 mb-4 opacity-20" />
        <p>{t('settings.noSettings')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-w-bg-elev rounded-theme-lg shadow-card border border-w-border overflow-y-auto p-6 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="w-6 h-6 text-w-accent" />
        <h2 className="text-xl font-bold text-w-fg">{t('settings.title')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schema.map(def => {
          const value = settings[def.id] !== undefined ? settings[def.id] : def.default;

          return (
            <div key={def.id} className="flex flex-col gap-2 p-4 rounded-theme-lg bg-w-bg-elev border border-w-border shadow-card hover:shadow-md transition-shadow">
              <label
                htmlFor={def.id}
                className="text-sm font-semibold text-w-fg-soft"
              >
                {t(def.label)}
              </label>

              {def.type === 'number' && (
                <div className="flex items-center">
                  <input
                    type="range"
                    id={def.id}
                    min={def.min}
                    max={def.max}
                    step={def.step || 1}
                    value={value}
                    onChange={(e) => handleNumberChange(e, def)}
                    className="w-full h-2 bg-w-bg-sunken rounded-lg appearance-none cursor-pointer mr-3"
                    style={{ accentColor: 'var(--w-accent)' }}
                  />
                  <span className="text-sm font-mono bg-w-bg px-2 py-1 rounded-theme-sm border border-w-border w-12 text-center text-w-fg shadow-sm">
                    {value}
                  </span>
                </div>
              )}

              {def.type === 'boolean' && (
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    id={def.id}
                    checked={!!value}
                    onChange={(e) => handleBooleanChange(e, def)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all peer-focus:outline-none peer-focus:ring-4"
                    style={{
                      backgroundColor: value ? 'var(--w-accent)' : 'var(--w-border-strong)',
                      '--tw-ring-color': 'color-mix(in srgb, var(--w-accent) 30%, transparent)',
                    } as React.CSSProperties}
                  >
                    <span className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-w-bg-elev border border-w-border shadow-sm transition-all" style={{ transform: value ? 'translateX(100%)' : 'none' }} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-w-fg-soft">
                    {value ? t('settings.on') : t('settings.off')}
                  </span>
                </label>
              )}

              {def.type === 'select' && (
                <select
                  id={def.id}
                  value={value}
                  onChange={(e) => handleSelectChange(e, def)}
                  className="bg-w-bg border border-w-border text-w-fg text-sm rounded-theme-md block w-full p-2.5 shadow-sm transition-colors outline-none"
                  style={{ '--tw-ring-color': 'var(--w-accent)' } as React.CSSProperties}
                >
                  {def.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label.startsWith('settings.') ? t(opt.label) : opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
