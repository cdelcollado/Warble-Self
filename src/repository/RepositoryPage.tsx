import { useState, useCallback } from 'react'
import { Database, Search, Upload, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RADIO_BRANDS } from '../lib/catalog'
import { useRepository, type RepositoryFilters } from './useRepository'
import { CodefileCard } from './CodefileCard'
import { UploadModal } from './UploadModal'
import type { MemoryChannel } from '../lib/types'
import { Button } from '../components/ui/Button'

interface RepositoryPageProps {
  isDarkMode: boolean
  onLoadToEditor: (channels: MemoryChannel[], model: string) => void
}

const PAGE_SIZE = 20

const DEFAULT_FILTERS: RepositoryFilters = {
  search: '',
  brand: '',
  model: '',
  country: '',
  sortBy: 'newest',
}

export function RepositoryPage({ isDarkMode, onLoadToEditor }: RepositoryPageProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<RepositoryFilters>(DEFAULT_FILTERS)
  const [pendingSearch, setPendingSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [page, setPage] = useState(0)

  const { codefiles, total, loading, refetch } = useRepository(filters, page)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const applySearch = useCallback(() => {
    setFilters(f => ({ ...f, search: pendingSearch }))
    setPage(0)
  }, [pendingSearch])

  const setFilter = (key: keyof RepositoryFilters, value: string) => {
    setFilters(f => {
      const next = { ...f, [key]: value }
      if (key === 'brand') next.model = ''
      return next
    })
    setPage(0)
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setPendingSearch('')
    setPage(0)
  }

  const hasActiveFilters = filters.brand || filters.model || filters.country || filters.sortBy !== 'newest'

  const models = filters.brand ? RADIO_BRANDS[filters.brand] ?? [] : []

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 px-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {t('repository.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('repository.subtitle')}
          </p>
        </div>

        <Button variant="primary" onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4" />
          {t('repository.upload.button')}
        </Button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={pendingSearch}
            onChange={e => setPendingSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            placeholder={t('repository.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button variant="primary" onClick={applySearch}>
          {t('repository.search')}
        </Button>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('repository.filterButton')}
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.upload.brand')}
            </label>
            <select
              value={filters.brand}
              onChange={e => setFilter('brand', e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('repository.filter.allBrands')}</option>
              {Object.keys(RADIO_BRANDS).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.upload.model')}
            </label>
            <select
              value={filters.model}
              onChange={e => setFilter('model', e.target.value)}
              disabled={!filters.brand}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
            >
              <option value="">{t('repository.filter.allModels')}</option>
              {models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.upload.country')}
            </label>
            <input
              type="text"
              value={filters.country}
              onChange={e => setFilter('country', e.target.value)}
              placeholder={t('repository.filter.anyCountry')}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.filter.sortBy')}
            </label>
            <select
              value={filters.sortBy}
              onChange={e => setFilter('sortBy', e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">{t('repository.filter.newest')}</option>
              <option value="downloads">{t('repository.filter.mostDownloaded')}</option>
              <option value="rating">{t('repository.filter.bestRated')}</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" />
              {t('repository.filter.clear')}
            </Button>
          )}
        </div>
      )}

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {t('repository.results', { count: total })}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : codefiles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Database className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {t('repository.empty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {codefiles.map(cf => (
            <CodefileCard
              key={cf.id}
              codefile={cf}
              isDarkMode={isDarkMode}
              onDownloaded={refetch}
              onLoadToEditor={onLoadToEditor}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {t('repository.page', { current: page + 1, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
