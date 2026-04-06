import { Download, MapPin, Radio, User, LogIn, Eye, MessageSquare, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { CodefileWithAuthor } from '../lib/supabase'
import type { MemoryChannel } from '../lib/types'
import { downloadCodefile } from './useRepository'
import { PreviewModal } from './PreviewModal'
import { CodefileDetailModal } from './CodefileDetailModal'
import { Button } from '../components/ui/Button'

// Models with an available preview driver
const PREVIEWABLE_MODELS = new Set(['UV-5R', 'UV-5R MINI'])

interface CodefileCardProps {
  codefile: CodefileWithAuthor
  user: SupabaseUser | null
  isDarkMode: boolean
  onOpenAuth: () => void
  onDownloaded: () => void
  onLoadToEditor: (channels: MemoryChannel[], model: string) => void
}

export function CodefileCard({ codefile, user, isDarkMode, onOpenAuth, onDownloaded, onLoadToEditor }: CodefileCardProps) {
  const { t } = useTranslation()
  const [downloading, setDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const canPreview = codefile.file_format === 'img' && PREVIEWABLE_MODELS.has(codefile.model)

  const handleDownload = async () => {
    setDownloading(true)
    const fileName = `${codefile.brand}_${codefile.model}_${codefile.title}.${codefile.file_format}`
      .replace(/\s+/g, '_')
      .toLowerCase()
    await downloadCodefile(codefile.id, codefile.file_path, fileName)
    setDownloading(false)
    onDownloaded()
  }

  const author = codefile.profiles?.callsign ?? t('repository.card.unknownAuthor')
  const location = [codefile.region, codefile.country].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:shadow-slate-200/70 dark:hover:shadow-slate-950/50 transition-all overflow-hidden">
      {/* Top row: format badge + brand/model */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-snug">
            {codefile.title}
          </span>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Radio className="w-3 h-3 shrink-0" />
            <span className="truncate">{codefile.brand} {codefile.model}</span>
          </div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${
          codefile.file_format === 'img'
            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
        }`}>
          .{codefile.file_format}
        </span>
      </div>

      {/* Description */}
      {codefile.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
          {codefile.description}
        </p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {author}
        </span>
        {location && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {location}
          </span>
        )}
        {codefile.rating_count > 0 && (
          <span className="flex items-center gap-1 shrink-0 ml-auto">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="font-medium text-slate-600 dark:text-slate-300">{Number(codefile.avg_rating).toFixed(1)}</span>
            <span className="text-slate-400 dark:text-slate-500">({codefile.rating_count})</span>
          </span>
        )}
      </div>

      {/* Footer: downloads + buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-700/60">
        <button
          onClick={() => setShowDetail(true)}
          className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0"
        >
          <MessageSquare className="w-3 h-3" />
          {t('repository.card.details')}
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          {canPreview && (
            <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
              <Eye className="w-3 h-3" />
              {t('repository.card.preview')}
            </Button>
          )}
          {user ? (
            <Button variant="primary" size="sm" onClick={handleDownload} disabled={downloading}>
              <Download className="w-3 h-3" />
              {downloading ? t('repository.card.downloading') : t('repository.card.download')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onOpenAuth}>
              <LogIn className="w-3 h-3" />
              {t('repository.card.loginToDownload')}
            </Button>
          )}
        </div>
      </div>

      {showPreview && (
        <PreviewModal
          codefile={codefile}
          isDarkMode={isDarkMode}
          onClose={() => setShowPreview(false)}
          onLoadToEditor={onLoadToEditor}
        />
      )}

      {showDetail && (
        <CodefileDetailModal
          codefile={codefile}
          user={user}
          onClose={() => setShowDetail(false)}
          onOpenAuth={onOpenAuth}
        />
      )}
    </div>
  )
}
