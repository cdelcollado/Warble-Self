import { useState, useEffect, useRef } from 'react'
import { X, Mail, Lock, Radio, Loader2, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'
import { useToast } from '../hooks/useToast'
import { Button } from '../components/ui/Button'

type Mode = 'login' | 'register'

interface AuthModalProps {
  onClose: () => void
  initialMode?: Mode
}

export function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { signIn, signUp } = useAuth()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [callsign, setCallsign] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    emailRef.current?.focus()
  }, [mode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
    } else {
      const { error: err } = await signUp(email, password, callsign || undefined)
      setIsLoading(false)
      if (err) {
        if (err.message.toLowerCase().includes('already registered')) {
          setError(t('auth.errors.emailTaken'))
        } else {
          setError(t('auth.errors.generic'))
        }
      } else {
        setRegistered(true)
      }
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setEmail('')
    setPassword('')
    setCallsign('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-slate-950/70 border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {registered
              ? t('auth.checkEmail')
              : mode === 'login'
              ? t('auth.loginTitle')
              : t('auth.registerTitle')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Confirmation screen after register */}
          {registered ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('auth.success.registered')}
              </p>
              <Button variant="primary" fullWidth className="mt-4" onClick={onClose}>
                {t('auth.close')}
              </Button>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
                {(['login', 'register'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      mode === m
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {m === 'login' ? t('auth.login') : t('auth.register')}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {/* Email */}
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

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password')}
                    required
                    minLength={6}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Callsign (register only) */}
                {mode === 'register' && (
                  <div className="relative">
                    <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                      placeholder={t('auth.callsign')}
                      maxLength={10}
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors uppercase"
                    />
                  </div>
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
                  {mode === 'login' ? t('auth.loginButton') : t('auth.registerButton')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
