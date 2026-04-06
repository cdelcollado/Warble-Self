import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, callsign?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { callsign: callsign?.toUpperCase() || null } },
    })

    if (data.user && !error) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        callsign: callsign?.toUpperCase() || null,
        country: null,
      })
    }

    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const displayName = user
    ? (user.user_metadata?.callsign as string | null) ?? user.email?.split('@')[0] ?? 'User'
    : null

  return { user, loading, displayName, signIn, signUp, signOut }
}
