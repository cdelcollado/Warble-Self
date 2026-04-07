import { useEffect, useState, useRef } from 'react'
import { X, Star, MessageSquare, Flag, Trash2, CornerDownRight, Send, Download, MapPin, Radio, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '../auth/useAuth'
import type { CodefileWithAuthor, Comment, Rating } from '../lib/supabase'
import {
  fetchRatings, upsertRating, deleteRating,
  fetchComments, addComment, deleteComment, reportContent,
} from './useRepository'

// ── Utilitats ────────────────────────────────────────────────────────────────

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

// ── StarRating ───────────────────────────────────────────────────────────────

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

// ── ReportDialog ─────────────────────────────────────────────────────────────

function ReportDialog({
  onConfirm, onCancel,
}: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder={t('repository.detail.reportReason')}
        rows={2}
        maxLength={300}
        className="w-full text-xs px-2 py-1.5 rounded-lg border border-red-200 dark:border-red-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-3 py-1 rounded-lg text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
          {t('app.driverMismatch.cancel')}
        </button>
        <button
          onClick={() => onConfirm(reason)}
          className="text-xs px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
        >
          {t('repository.detail.reportConfirm')}
        </button>
      </div>
    </div>
  )
}

// ── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({
  comment, replies, user, locale,
  onReply, onDelete, onReport,
}: {
  comment: Comment
  replies: Comment[]
  user: AuthUser | null
  locale: string
  onReply: (parentId: string, body: string) => Promise<void>
  onDelete: (id: string) => void
  onReport: (commentId: string, reason: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [showReply, setShowReply] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [showReport, setShowReport] = useState(false)
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
      {/* Comment */}
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
            {user && (
              <button onClick={() => setShowReply(v => !v)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                <CornerDownRight className="w-3 h-3" />
                {t('repository.detail.reply')}
              </button>
            )}
            {user && user.id !== comment.authorId && (
              <button onClick={() => setShowReport(v => !v)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <Flag className="w-3 h-3" />
                {t('repository.detail.report')}
              </button>
            )}
            {user && user.id === comment.authorId && (
              <button onClick={() => onDelete(comment.id)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
                {t('repository.detail.delete')}
              </button>
            )}
          </div>
          {showReport && (
            <div className="mt-2">
              <ReportDialog
                onConfirm={async reason => { await onReport(comment.id, reason); setShowReport(false) }}
                onCancel={() => setShowReport(false)}
              />
            </div>
          )}
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

      {/* Replies */}
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
                    {user && user.id !== reply.authorId && (
                      <button onClick={() => onReport(reply.id, '')} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <Flag className="w-3 h-3" />
                        {t('repository.detail.report')}
                      </button>
                    )}
                    {user && user.id === reply.authorId && (
                      <button onClick={() => onDelete(reply.id)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                        {t('repository.detail.delete')}
                      </button>
                    )}
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

// ── CodefileDetailModal ───────────────────────────────────────────────────────

interface CodefileDetailModalProps {
  codefile: CodefileWithAuthor
  user: AuthUser | null
  onClose: () => void
  onOpenAuth: () => void
}

export function CodefileDetailModal({ codefile, user, onClose, onOpenAuth }: CodefileDetailModalProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language

  const [ratings, setRatings] = useState<Rating[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  const avg = avgRating(ratings)
  const userRating = ratings.find(r => r.userId === user?.id)?.rating ?? 0
  const author = codefile.profiles?.callsign ?? t('repository.card.unknownAuthor')
  const location = [codefile.region, codefile.country].filter(Boolean).join(', ')

  // Carrega dades
  useEffect(() => {
    fetchRatings(codefile.id).then(setRatings)
    fetchComments(codefile.id).then(setComments)
  }, [codefile.id])

  // Rating
  const handleRate = async (value: number) => {
    if (!user) { onOpenAuth(); return }
    if (value === 0) {
      await deleteRating(codefile.id, user.id)
      setRatings(prev => prev.filter(r => r.userId !== user.id))
    } else {
      await upsertRating(codefile.id, user.id, value)
      setRatings(prev => {
        const without = prev.filter(r => r.userId !== user.id)
        return [...without, { id: '', codefileId: codefile.id, userId: user.id, rating: value, createdAt: new Date().toISOString() }]
      })
    }
  }

  // Comentari arrel
  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return
    setSubmittingComment(true)
    await addComment(codefile.id, user.id, newComment.trim())
    setNewComment('')
    const updated = await fetchComments(codefile.id)
    setComments(updated)
    setSubmittingComment(false)
  }

  // Resposta
  const handleReply = async (parentId: string, body: string) => {
    if (!user) return
    await addComment(codefile.id, user.id, body, parentId)
    const updated = await fetchComments(codefile.id)
    setComments(updated)
  }

  // Esborrar
  const handleDelete = async (id: string) => {
    await deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id && c.parentId !== id))
  }

  // Report comment
  const handleReportComment = async (commentId: string, reason: string) => {
    if (!user) return
    await reportContent(user.id, { commentId }, reason)
  }

  // Report codefile
  const handleReportCodefile = async (reason: string) => {
    if (!user) return
    await reportContent(user.id, { codefileId: codefile.id }, reason)
    setShowReportModal(false)
  }

  // Organise comments into a tree (root + replies)
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 shrink-0 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">

          {/* Description */}
          {codefile.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{codefile.description}</p>
          )}

          {/* Rating */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {t('repository.detail.rating')}
              </span>
              {user && (
                <button onClick={() => setShowReportModal(v => !v)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                  <Flag className="w-3 h-3" />
                  {t('repository.detail.reportCodefile')}
                </button>
              )}
            </div>
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
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t('repository.detail.yourRating')}:</span>
                <StarRating value={userRating} interactive onChange={handleRate} />
                {userRating > 0 && (
                  <button onClick={() => handleRate(0)} className="text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                    {t('repository.detail.removeRating')}
                  </button>
                )}
              </div>
            ) : (
              <button onClick={onOpenAuth} className="text-xs text-blue-600 dark:text-blue-400 hover:underline text-left">
                {t('repository.detail.loginToRate')}
              </button>
            )}
            {showReportModal && (
              <ReportDialog onConfirm={handleReportCodefile} onCancel={() => setShowReportModal(false)} />
            )}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              {t('repository.detail.comments')} ({rootComments.length})
            </span>

            {/* Add comment */}
            {user ? (
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
            ) : (
              <button onClick={onOpenAuth} className="text-xs text-blue-600 dark:text-blue-400 hover:underline text-left">
                {t('repository.detail.loginToComment')}
              </button>
            )}

            {/* Comment list */}
            {rootComments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">{t('repository.detail.noComments')}</p>
            ) : (
              <div className="flex flex-col gap-4">
                {rootComments.map(c => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    replies={repliesMap[c.id] ?? []}
                    user={user}
                    locale={locale}
                    onReply={handleReply}
                    onDelete={handleDelete}
                    onReport={handleReportComment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {t('auth.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
