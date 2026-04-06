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
      <div className="flex flex-col items-center justify-center p-8 text-slate-500">
        <Settings2 className="w-12 h-12 mb-4 opacity-20" />
        <p>{t('settings.noSettings')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 rounded-xl shadow-sm shadow-slate-100/80 dark:shadow-slate-950/40 border border-slate-200 dark:border-slate-800 overflow-y-auto p-6 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="w-6 h-6 text-blue-600 dark:text-blue-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('settings.title')}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schema.map(def => {
          const value = settings[def.id] !== undefined ? settings[def.id] : def.default;

          return (
            <div key={def.id} className="flex flex-col gap-2 p-4 rounded-xl bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm shadow-slate-100/80 dark:shadow-slate-950/40 hover:shadow-md hover:shadow-slate-200/60 dark:hover:shadow-slate-950/50 transition-shadow">
              <label 
                htmlFor={def.id} 
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600 mr-3"
                  />
                  <span className="text-sm font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 w-12 text-center text-slate-800 dark:text-slate-200 shadow-sm">
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
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {value ? t('settings.on') : t('settings.off')}
                  </span>
                </label>
              )}

              {def.type === 'select' && (
                <select
                  id={def.id}
                  value={value}
                  onChange={(e) => handleSelectChange(e, def)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm transition-colors"
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
