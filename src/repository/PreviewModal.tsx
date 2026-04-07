import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Eye, Loader2, AlertCircle, ArrowRightToLine } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz, colorSchemeDark } from 'ag-grid-community'
import { useTranslation } from 'react-i18next'
import type { CodefileWithAuthor } from '../lib/catalog'
import type { MemoryChannel } from '../lib/types'
import { decodeUV5R } from '../lib/drivers/uv5r'
import { decodeUV5RMini } from '../lib/drivers/uv5rmini'
import { decodeRT4D } from '../lib/drivers/rt4d'
import { fetchCodefileBuffer } from './useRepository'

ModuleRegistry.registerModules([AllCommunityModule])

// Map Warble model → decode function
const DECODE_MAP: Record<string, (data: Uint8Array) => MemoryChannel[]> = {
  'UV-5R':      decodeUV5R,
  'UV-5R MINI': decodeUV5RMini,
  'RT-4D':      decodeRT4D,
}

// Models with DMR-specific columns
const DMR_MODELS = new Set(['RT-4D'])

function getDecoder(model: string): ((data: Uint8Array) => MemoryChannel[]) | null {
  return DECODE_MAP[model] ?? null
}

interface PreviewModalProps {
  codefile: CodefileWithAuthor
  isDarkMode: boolean
  onClose: () => void
  onLoadToEditor: (channels: MemoryChannel[], model: string) => void
}

export function PreviewModal({ codefile, isDarkMode, onClose, onLoadToEditor }: PreviewModalProps) {
  const { t } = useTranslation()
  const gridRef = useRef<AgGridReact>(null)
  const [channels, setChannels] = useState<MemoryChannel[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const gridTheme = useMemo(
    () => isDarkMode ? themeQuartz.withPart(colorSchemeDark) : themeQuartz,
    [isDarkMode]
  )

  const isDmrModel = DMR_MODELS.has(codefile.model)

  const columnDefs = useMemo(() => {
    if (isDmrModel) {
      return [
        { field: 'index',        headerName: t('grid.columns.loc'),       width: 70,  pinned: 'left' },
        { field: 'name',         headerName: t('grid.columns.name'),       width: 160 },
        { field: 'frequency',    headerName: t('grid.columns.frequency'),  width: 130 },
        { field: 'duplex',       headerName: t('grid.columns.duplex'),     width: 80  },
        { field: 'offset',       headerName: t('grid.columns.offset'),     width: 110 },
        { field: 'mode',         headerName: t('grid.columns.mode'),       width: 80  },
        { field: 'timeslot',     headerName: t('grid.columns.timeslot'),   width: 90,
          valueFormatter: (p: any) => p.value != null ? `TS${p.value}` : '—' },
        { field: 'contactIndex', headerName: t('grid.columns.talkgroup'),  width: 90,
          valueFormatter: (p: any) => p.value != null ? `#${p.value}` : '—' },
      ]
    }
    return [
      { field: 'index',     headerName: t('grid.columns.loc'),       width: 70,  pinned: 'left' },
      { field: 'frequency', headerName: t('grid.columns.frequency'),  width: 130 },
      { field: 'name',      headerName: t('grid.columns.name'),       width: 120 },
      { field: 'duplex',    headerName: t('grid.columns.duplex'),     width: 90  },
      { field: 'offset',    headerName: t('grid.columns.offset'),     width: 110 },
      { field: 'mode',      headerName: t('grid.columns.mode'),       width: 80  },
      { field: 'power',     headerName: t('grid.columns.power'),      width: 80  },
      { field: 'toneMode',  headerName: t('grid.columns.toneMode'),   width: 100 },
      { field: 'tone',      headerName: t('grid.columns.tone'),       width: 80  },
    ]
  }, [t, isDmrModel])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const decoder = getDecoder(codefile.model)
      if (!decoder) {
        setError(t('repository.preview.unsupportedModel', { model: codefile.model }))
        setLoading(false)
        return
      }

      const { buffer, error: fetchError } = await fetchCodefileBuffer(codefile.filePath, codefile.id)
      if (cancelled) return

      if (fetchError || !buffer) {
        setError(fetchError ?? t('repository.preview.fetchError'))
        setLoading(false)
        return
      }

      try {
        const decoded = decoder(buffer)
        if (!cancelled) setChannels(decoded)
      } catch {
        if (!cancelled) setError(t('repository.preview.decodeError'))
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [codefile, t])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate leading-snug">
                {codefile.title}
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {codefile.brand} {codefile.model}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">{t('repository.preview.loading')}</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500 dark:text-slate-400">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span className="text-sm text-center">{error}</span>
            </div>
          )}

          {channels && (
            <div className="h-[480px]">
              <AgGridReact
                ref={gridRef}
                rowData={channels}
                columnDefs={columnDefs as any}
                theme={gridTheme}
                rowHeight={32}
                headerHeight={36}
                suppressMovableColumns
                suppressCellFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {channels ? t('repository.preview.channelCount', { count: channels.length }) : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('auth.close')}
            </button>
            {channels && (
              <button
                onClick={() => { onLoadToEditor(channels, codefile.model); onClose() }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                <ArrowRightToLine className="w-3.5 h-3.5" />
                {t('repository.preview.loadToEditor')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
