import { useState, useRef } from 'react'
import { Upload, X, FileUp, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RADIO_BRANDS } from '../lib/catalog'
import { uploadCodefile } from './useRepository'
import { detectRadioFromImg } from '../lib/imgDetection'
import { Button } from '../components/ui/Button'

interface UploadModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [country, setCountry] = useState('')
  const [region, setRegion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [autoDetected, setAutoDetected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const models = brand ? RADIO_BRANDS[brand] ?? [] : []

  const handleBrandChange = (b: string) => {
    setBrand(b)
    setModel('')
    setAutoDetected(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && !f.name.match(/\.(img|csv|ddmr)$/i)) {
      setError(t('repository.upload.invalidFormat'))
      return
    }
    setError(null)
    setFile(f)
    setAutoDetected(false)

    if (f && f.name.match(/\.(img|ddmr)$/i)) {
      const detected = await detectRadioFromImg(f)
      if (detected) {
        setBrand(detected.brand)
        setModel(detected.model)
        setAutoDetected(true)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)

    const { error: err } = await uploadCodefile(
      { title, description, brand, model, country, region },
      file
    )

    setLoading(false)
    if (err) {
      setError(err)
    } else {
      onSuccess()
    }
  }

  const isValid = title.trim() && brand && model && country.trim() && file

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/70 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            {t('repository.upload.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.upload.titleField')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('repository.upload.titlePlaceholder')}
              maxLength={100}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.upload.description')}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('repository.upload.descriptionPlaceholder')}
              rows={3}
              maxLength={500}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Auto-detect badge */}
          {autoDetected && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {t('repository.upload.autoDetected', { brand, model })}
            </div>
          )}

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t('repository.upload.brand')} *
              </label>
              <select
                value={brand}
                onChange={e => handleBrandChange(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('repository.upload.selectBrand')}</option>
                {Object.keys(RADIO_BRANDS).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t('repository.upload.model')} *
              </label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                disabled={!brand}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
              >
                <option value="">{t('repository.upload.selectModel')}</option>
                {models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Country + Region */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t('repository.upload.country')} *
              </label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder={t('repository.upload.countryPlaceholder')}
                maxLength={60}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t('repository.upload.region')}
              </label>
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder={t('repository.upload.regionPlaceholder')}
                maxLength={60}
                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* File */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.upload.file')} *
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <FileUp className="w-4 h-4 shrink-0" />
              {file ? (
                <span className="truncate text-slate-700 dark:text-slate-200 font-medium">{file.name}</span>
              ) : (
                <span>{t('repository.upload.filePlaceholder')}</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".img,.csv,.ddmr"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('auth.close')}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!isValid || loading}>
            <Upload className="w-3.5 h-3.5" />
            {loading ? t('repository.upload.uploading') : t('repository.upload.submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
