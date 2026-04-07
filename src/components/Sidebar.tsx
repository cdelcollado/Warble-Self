import { Table, Settings2, Database, FolderOpen, Save, Moon, Sun, Globe, LogIn, LogOut, User, Radio, UploadCloud, FileDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '../auth/useAuth'
import { SUPPORTED_RADIOS } from '../lib/drivers'

type Tab = 'memory' | 'settings' | 'repository'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  user: AuthUser | null
  displayName: string | null
  onOpenAuth: () => void
  onOpenProfile: () => void
  onSignOut: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
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
  { id: 'memory' as Tab,     icon: Table,    labelKey: 'app.tabs.memory' },
  { id: 'settings' as Tab,   icon: Settings2, labelKey: 'app.tabs.settings' },
  { id: 'repository' as Tab, icon: Database,  labelKey: 'repository.tab' },
]

export function Sidebar({
  activeTab, onTabChange,
  user, displayName, onOpenAuth, onOpenProfile, onSignOut,
  isDarkMode, onToggleDarkMode,
  selectedDriverId, onDriverChange,
  rawBuffer, onOpenFile, onSaveImg, onSaveCSV, onRequestWrite,
  isDirty,
}: SidebarProps) {
  const { t, i18n } = useTranslation()
  const showFileActions = activeTab !== 'repository'

  return (
    <aside className="w-56 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 z-10">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/warble-logo.png" alt="Warble" className="w-11 h-11 object-contain" />
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none">
              Warble<span className="text-blue-600 dark:text-blue-500">.</span>
            </h1>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wide leading-none">
              {t('app.beta')}
            </span>
          </div>
        </div>
      </div>

      {/* Auth */}
      <div className="px-3 pt-3">
        {user ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
            <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <button
              onClick={onOpenProfile}
              className="flex-1 text-xs font-semibold text-blue-700 dark:text-blue-400 truncate text-left hover:underline"
              title={t('profile.title')}
            >
              {displayName}
            </button>
            <button
              onClick={onSignOut}
              title={t('auth.logout')}
              className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            {t('auth.login')}
          </button>
        )}
      </div>

      {/* Radio model */}
      <div className="px-3 pt-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Radio className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedDriverId}
            onChange={(e) => onDriverChange(e.target.value)}
            className="flex-1 bg-transparent text-xs font-semibold text-blue-700 dark:text-blue-400 outline-none cursor-pointer min-w-0"
          >
            {SUPPORTED_RADIOS.map(r => (
              <option key={r.id} value={r.id} className="bg-white dark:bg-slate-800 font-normal text-slate-800 dark:text-slate-200">
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
              <span className="flex-1 text-left">{t(labelKey)}</span>
              {id === 'memory' && isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
              )}
            </button>
          )
        })}
      </nav>

      {/* File Actions + Language + Dark mode */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
        {showFileActions && (
          <>
            <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              {t('app.sections.file')}
            </p>
            <button
              onClick={onOpenFile}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
              {t('app.buttons.openFile')}
            </button>
            <button
              onClick={onSaveImg}
              disabled={!rawBuffer}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed transition-colors group"
            >
              <Save className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
              {t('app.buttons.saveImg')}
            </button>
            <button
              onClick={onSaveCSV}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
              {t('grid.buttons.export')}
            </button>
            <button
              onClick={onRequestWrite}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
            >
              <UploadCloud className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
              {t('grid.buttons.write')}
            </button>
            <div className="mt-1 mb-0.5 border-t border-slate-100 dark:border-slate-800" />
          </>
        )}

        {/* Language + Dark mode row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={i18n.resolvedLanguage || i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="flex-1 bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer min-w-0"
            >
              <option value="en" className="bg-white dark:bg-slate-800">{t('language.en')}</option>
              <option value="es" className="bg-white dark:bg-slate-800">{t('language.es')}</option>
              <option value="ca" className="bg-white dark:bg-slate-800">{t('language.ca')}</option>
            </select>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode
              ? <Sun className="w-3.5 h-3.5 text-slate-400 dark:text-slate-300" />
              : <Moon className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
