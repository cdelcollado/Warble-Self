import { useState, useEffect, useRef } from 'react'
import { X, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'
import { authApi } from '../lib/api'
import { useToast } from '../hooks/useToast'
import { Button } from '../components/ui/Button'

type Mode = 'login' | 'forgot' | 'reset'

interface AuthModalProps {
  onClose: () => void
  initialMode?: Mode
}

export function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { signIn } = useAuth()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'reset') {
      passwordRef.current?.focus()
    } else {
      emailRef.current?.focus()
    }
  }, [mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      setIsLoading(false)
      if (err) {
        setError(t('auth.errors.invalidCredentials'))
      } else {
        toast.success(t('auth.success.loggedIn', { name: email.split('@')[0] }))
        onClose()
      }
    } else if (mode === 'forgot') {
      const { error: err } = await authApi('/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}?reset=true`,
        }),
      })
      setIsLoading(false)
      if (err) {
        setError(t('auth.errors.generic'))
      } else {
        setResetSent(true)
      }
    } else if (mode === 'reset') {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      if (!token) {
        setIsLoading(false)
        setError(t('auth.errors.generic'))
        return
      }
      const { error: err } = await authApi('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      })
      setIsLoading(false)
      if (err) {
        setError(t('auth.errors.generic'))
      } else {
        window.history.replaceState({}, '', window.location.pathname)
        setPasswordChanged(true)
      }
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setEmail('')
    setPassword('')
    setResetSent(false)
  }

  const title = resetSent
    ? t('auth.resetSent')
    : passwordChanged
    ? t('auth.passwordChanged')
    : mode === 'login'
    ? t('auth.loginTitle')
    : mode === 'reset'
    ? t('auth.resetPasswordTitle')
    : t('auth.forgotTitle')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/70 border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          {mode !== 'login' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {/* Success: reset email sent */}
          {resetSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('auth.resetEmailSent')}
              </p>
              <Button variant="ghost" fullWidth className="mt-4" onClick={() => switchMode('login')}>
                {t('auth.backToLogin')}
              </Button>
            </div>

          /* Success: password changed */
          ) : passwordChanged ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('auth.success.passwordChanged')}
              </p>
              <Button variant="primary" fullWidth className="mt-4" onClick={() => switchMode('login')}>
                {t('auth.login')}
              </Button>
            </div>

          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Email (not for reset) */}
              {mode !== 'reset' && (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email')}
                    required
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              {/* Password (not for forgot) */}
              {mode !== 'forgot' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={mode === 'reset' ? passwordRef : undefined}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'reset' ? t('auth.newPassword') : t('auth.password')}
                    required
                    minLength={8}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              {/* Forgot password link (login mode) */}
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline text-right -mt-1"
                >
                  {t('auth.forgotPassword')}
                </button>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" variant="primary" fullWidth className="mt-1" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login'
                  ? t('auth.loginButton')
                  : mode === 'reset'
                  ? t('auth.setNewPassword')
                  : t('auth.sendResetLink')}
              </Button>

              {/* Back to login (forgot / reset mode) */}
              {(mode === 'forgot' || mode === 'reset') && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:underline text-center"
                >
                  {t('auth.backToLogin')}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
