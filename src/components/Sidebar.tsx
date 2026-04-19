import { Table, Settings2, Database, FolderOpen, Save, Globe, Radio, UploadCloud, FileDown, MapPin, Github } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_RADIOS } from '../lib/drivers'

type Tab = 'home' | 'memory' | 'settings' | 'repeaterbook' | 'repository'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  selectedDriverId: string
  onDriverChange: (id: string) => void
  rawBuffer: Uint8Array | null
  onOpenFile: () => void
  onSaveImg: () => void
  onSaveCSV: () => void
  onRequestWrite: () => void
  isDirty: boolean
}

const NAV_ITEMS = [
  { id: 'memory' as Tab,       icon: Table,    labelKey: 'app.tabs.memory' },
  { id: 'settings' as Tab,     icon: Settings2, labelKey: 'app.tabs.settings' },
  { id: 'repeaterbook' as Tab, icon: MapPin,   labelKey: 'repeaterBook.tab' },
  { id: 'repository' as Tab,   icon: Database,  labelKey: 'repository.tab' },
]

export function Sidebar({
  activeTab, onTabChange,
  selectedDriverId, onDriverChange,
  rawBuffer, onOpenFile, onSaveImg, onSaveCSV, onRequestWrite,
  isDirty,
}: SidebarProps) {
  const { t, i18n } = useTranslation()
  const showFileActions = activeTab !== 'repository' && activeTab !== 'home'

  return (
    <aside className="w-56 h-screen bg-w-bg-elev border-r border-w-border flex flex-col flex-shrink-0 z-10">

      {/* Logo — click to go home */}
      <button
        onClick={() => onTabChange('home')}
        className="px-4 py-5 border-b border-w-border-soft shrink-0 w-full text-left hover:bg-w-bg-hover transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <img src="/warble-logo.png" alt="Warble" className="w-11 h-11 object-contain" />
          <div>
            <h1 className="text-2xl font-black text-w-fg tracking-tighter leading-none font-display">
              Warble<span className="text-w-accent">.</span>
            </h1>
            <span className="text-[10px] font-bold text-w-accent-fg tracking-wide leading-none font-mono">
              {t('app.beta')}
            </span>
          </div>
        </div>
      </button>

      {/* Radio model */}
      <div className="px-3 pt-3 shrink-0">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-w-fg-faint font-mono">
          {t('app.selectRadio')}
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-theme-md bg-w-bg-sunken border border-w-border">
          <Radio className="w-3.5 h-3.5 text-w-fg-faint shrink-0" />
          <select
            value={selectedDriverId}
            onChange={(e) => onDriverChange(e.target.value)}
            className="flex-1 bg-transparent text-xs font-semibold text-w-accent-fg outline-none cursor-pointer min-w-0"
          >
            {SUPPORTED_RADIOS.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-theme-md text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-w-accent-soft text-w-accent-fg font-semibold nav-active'
                  : 'text-w-fg-soft hover:bg-w-bg-hover hover:text-w-fg'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-w-accent' : 'text-w-fg-faint group-hover:text-w-fg-soft'}`} />
              <span className="flex-1 text-left">{t(labelKey)}</span>
              {id === 'memory' && isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-sig-amber shrink-0" title="Unsaved changes" />
              )}
            </button>
          )
        })}
      </nav>

      {/* File Actions + Language */}
      <div className="px-3 py-3 border-t border-w-border-soft flex flex-col gap-1 shrink-0 overflow-y-auto">
        {showFileActions && (
          <>
            <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-w-fg-faint font-mono">
              {t('app.sections.file')}
            </p>
            <button
              onClick={onOpenFile}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-theme-md text-xs font-medium text-w-fg-mute hover:bg-w-bg-hover hover:text-w-fg transition-colors group"
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-w-fg-faint group-hover:text-w-fg-mute" />
              {t('app.buttons.openFile')}
            </button>
            <button
              onClick={onSaveImg}
              disabled={!rawBuffer}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-theme-md text-xs font-medium text-w-fg-mute hover:bg-w-bg-hover hover:text-w-fg disabled:opacity-35 disabled:cursor-not-allowed transition-colors group"
            >
              <Save className="w-3.5 h-3.5 shrink-0 text-w-fg-faint group-hover:text-w-fg-mute" />
              {t('app.buttons.saveImg')}
            </button>
            <button
              onClick={onSaveCSV}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-theme-md text-xs font-medium text-w-fg-mute hover:bg-w-bg-hover hover:text-w-fg transition-colors group"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0 text-w-fg-faint group-hover:text-w-fg-mute" />
              {t('grid.buttons.export')}
            </button>
            <button
              onClick={onRequestWrite}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-theme-md text-xs font-medium text-w-fg-mute hover:bg-w-bg-hover hover:text-w-fg transition-colors group"
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0 text-w-fg-faint group-hover:text-w-fg-mute" />
              {t('grid.buttons.write')}
            </button>
            <div className="mt-1 mb-0.5 border-t border-w-border-soft" />
          </>
        )}

        {/* Language */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-theme-md bg-w-bg-sunken border border-w-border">
          <Globe className="w-3.5 h-3.5 text-w-fg-faint shrink-0" />
          <select
            value={i18n.resolvedLanguage || i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="flex-1 bg-transparent text-xs font-medium text-w-fg-soft outline-none cursor-pointer min-w-0"
          >
            <option value="en">{t('language.en')}</option>
            <option value="es">{t('language.es')}</option>
            <option value="ca">{t('language.ca')}</option>
          </select>
        </div>

        {/* GitHub */}
        <a
          href="https://github.com/cdelcollado/Warble-Self"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-theme-md text-xs font-medium text-w-fg-faint hover:text-w-fg-soft hover:bg-w-bg-hover transition-colors"
        >
          <Github className="w-3.5 h-3.5 shrink-0" />
          <span>GitHub</span>
        </a>
      </div>
    </aside>
  )
}
