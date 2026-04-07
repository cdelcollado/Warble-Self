import { useState, useEffect } from 'react'
import { authApi, api } from '../lib/api'

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface BetterAuthResponse {
  user: AuthUser
  token?: string
  session?: { id: string }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [callsign, setCallsign] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi<BetterAuthResponse>('/get-session')
      .then(async ({ data }) => {
        const sessionUser = data?.user ?? null
        setUser(sessionUser)
        if (sessionUser) {
          const { data: profile } = await api<{ callsign: string | null }>('/profiles/me')
          setCallsign(profile?.callsign ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authApi<BetterAuthResponse>('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (data?.user) {
      setUser(data.user)
      const { data: profile } = await api<{ callsign: string | null }>('/profiles/me')
      setCallsign(profile?.callsign ?? null)
    }
    return { error }
  }

  const signUp = async (email: string, password: string, callsignInput?: string) => {
    const name = callsignInput?.toUpperCase() || email
    const { data, error } = await authApi<BetterAuthResponse>('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    if (data?.user) {
      setUser(data.user)
      if (callsignInput) {
        await api('/profiles/me', {
          method: 'PUT',
          body: JSON.stringify({ callsign: callsignInput.toUpperCase() }),
        })
        setCallsign(callsignInput.toUpperCase())
      }
    }
    return { error }
  }

  const signOut = async () => {
    await authApi('/sign-out', { method: 'POST' })
    setUser(null)
    setCallsign(null)
  }

  const displayName = callsign ?? user?.email?.split('@')[0] ?? null

  return { user, loading, displayName, signIn, signUp, signOut }
}
