import { useEffect, useState, useRef } from 'react'
import { X, Star, MessageSquare, Trash2, CornerDownRight, Send, Download, MapPin, Radio, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CodefileWithAuthor, Comment, Rating } from '../lib/catalog'
import {
  fetchRatings, upsertRating, deleteRating,
  fetchComments, addComment, deleteComment,
  deleteCodefile,
} from './useRepository'

function relativeTime(date: string, locale: string): string {
  const diff = (new Date(date).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60)   return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

function avgRating(ratings: Rating[]): number {
  if (!ratings.length) return 0
  return ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
}

function StarRating({
  value, interactive, onChange,
}: { value: number; interactive: boolean; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n === value ? 0 : n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`transition-colors ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              n <= display
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function CommentItem({
  comment, replies, locale,
  onReply, onDelete,
}: {
  comment: Comment
  replies: Comment[]
  locale: string
  onReply: (parentId: string, body: string) => Promise<void>
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const [showReply, setShowReply] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const author = comment.profiles?.callsign ?? t('repository.card.unknownAuthor')

  const handleReply = async () => {
    if (!replyBody.trim()) return
    setSubmitting(true)
    await onReply(comment.id, replyBody.trim())
    setReplyBody('')
    setShowReply(false)
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
          {author[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{author}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{relativeTime(comment.createdAt, locale)}</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{comment.body}</p>
          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => setShowReply(v => !v)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              <CornerDownRight className="w-3 h-3" />
              {t('repository.detail.reply')}
            </button>
            <button onClick={() => onDelete(comment.id)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" />
              {t('repository.detail.delete')}
            </button>
          </div>
          {showReply && (
            <div className="mt-2 flex gap-2">
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder={t('repository.detail.replyPlaceholder')}
                rows={2}
                maxLength={2000}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleReply}
                disabled={submitting || !replyBody.trim()}
                className="self-end p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-9 flex flex-col gap-2 pl-3 border-l-2 border-slate-100 dark:border-slate-800">
          {replies.map(reply => {
            const rAuthor = reply.profiles?.callsign ?? t('repository.card.unknownAuthor')
            return (
              <div key={reply.id} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {rAuthor[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{rAuthor}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{relativeTime(reply.createdAt, locale)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{reply.body}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => onDelete(reply.id)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                      {t('repository.detail.delete')}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface CodefileDetailModalProps {
  codefile: CodefileWithAuthor
  onClose: () => void
  onDeleted: () => void
}

export function CodefileDetailModal({ codefile, onClose, onDeleted }: CodefileDetailModalProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language

  const [ratings, setRatings] = useState<Rating[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const avg = avgRating(ratings)
  const myRating = ratings.find(r => r.userId === 'local')?.rating ?? 0
  const author = codefile.profiles?.callsign ?? t('repository.card.unknownAuthor')
  const location = [codefile.region, codefile.country].filter(Boolean).join(', ')

  useEffect(() => {
    fetchRatings(codefile.id).then(setRatings)
    fetchComments(codefile.id).then(setComments)
  }, [codefile.id])

  const handleRate = async (value: number) => {
    if (value === 0) {
      await deleteRating(codefile.id, 'local')
      setRatings(prev => prev.filter(r => r.userId !== 'local'))
    } else {
      await upsertRating(codefile.id, 'local', value)
      setRatings(prev => {
        const without = prev.filter(r => r.userId !== 'local')
        return [...without, { id: '', codefileId: codefile.id, userId: 'local', rating: value, createdAt: new Date().toISOString() }]
      })
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setSubmittingComment(true)
    await addComment(codefile.id, 'local', newComment.trim())
    setNewComment('')
    const updated = await fetchComments(codefile.id)
    setComments(updated)
    setSubmittingComment(false)
  }

  const handleReply = async (parentId: string, body: string) => {
    await addComment(codefile.id, 'local', body, parentId)
    const updated = await fetchComments(codefile.id)
    setComments(updated)
  }

  const handleDeleteComment = async (id: string) => {
    await deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id && c.parentId !== id))
  }

  const handleDeleteCodefile = async () => {
    await deleteCodefile(codefile.id)
    onDeleted()
  }

  const rootComments = comments.filter(c => !c.parentId)
  const repliesMap: Record<string, Comment[]> = {}
  comments.filter(c => c.parentId).forEach(c => {
    if (!repliesMap[c.parentId!]) repliesMap[c.parentId!] = []
    repliesMap[c.parentId!].push(c)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                {codefile.title}
              </h2>
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide ${
                codefile.fileFormat === 'img'
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              }`}>
                .{codefile.fileFormat}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Radio className="w-3 h-3" />{codefile.brand} {codefile.model}</span>
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{author}</span>
              {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
              <span className="flex items-center gap-1"><Download className="w-3 h-3" />{codefile.downloads}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleDeleteCodefile}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title={t('repository.detail.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">

          {codefile.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{codefile.description}</p>
          )}

          {/* Rating */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('repository.detail.rating')}
            </span>
            <div className="flex items-center gap-3">
              {avg > 0 ? (
                <>
                  <StarRating value={Math.round(avg)} interactive={false} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{avg.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">({ratings.length})</span>
                </>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">{t('repository.detail.noRatings')}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('repository.detail.yourRating')}:</span>
              <StarRating value={myRating} interactive onChange={handleRate} />
              {myRating > 0 && (
                <button onClick={() => handleRate(0)} className="text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                  {t('repository.detail.removeRating')}
                </button>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              {t('repository.detail.comments')} ({rootComments.length})
            </span>

            <div className="flex gap-2">
              <textarea
                ref={commentInputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={t('repository.detail.commentPlaceholder')}
                rows={2}
                maxLength={2000}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment() }}
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={submittingComment || !newComment.trim()}
                className="self-end p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {rootComments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">{t('repository.detail.noComments')}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {rootComments.map(c => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    replies={repliesMap[c.id] ?? []}
                    locale={locale}
                    onReply={handleReply}
                    onDelete={handleDeleteComment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {t('auth.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
