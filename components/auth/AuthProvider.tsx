'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

type ActorSource = 'supabase-auth' | 'configured-default' | 'development-fallback'

type ActorInfo = {
  userId: string
  source: ActorSource
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  actor: ActorInfo | null
  /** Set when the browser has a session but `/api/auth/actor` failed (e.g. server cannot reach Supabase). */
  serverAuthError: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isUsingFallbackActor: boolean
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signUpWithPassword: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
  refreshActor: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchActor(accessToken?: string | null): Promise<{
  actor: ActorInfo | null
  serverAuthError: string | null
}> {
  const headers = new Headers()

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  try {
    const response = await fetch('/api/auth/actor', {
      method: 'GET',
      headers,
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as
      | { actor?: ActorInfo; error?: string }
      | null

    if (!response.ok) {
      return {
        actor: null,
        serverAuthError:
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : 'Could not verify session with the server.',
      }
    }

    return {
      actor: payload?.actor ?? null,
      serverAuthError: null,
    }
  } catch {
    return {
      actor: null,
      serverAuthError:
        'Could not reach this app’s server to verify your session. Check that the dev server is running.',
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [actor, setActor] = useState<ActorInfo | null>(null)
  const [serverAuthError, setServerAuthError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshActor = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    const { actor: nextActor, serverAuthError: nextErr } = await fetchActor(
      currentSession?.access_token
    )
    setActor(nextActor)
    setServerAuthError(nextErr)
  }, [])

  useEffect(() => {
    let active = true

    async function initialize() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession()

      if (!active) {
        return
      }

      setSession(initialSession)
      {
        const { actor: nextActor, serverAuthError: nextErr } = await fetchActor(
          initialSession?.access_token
        )
        setActor(nextActor)
        setServerAuthError(nextErr)
      }

      if (active) {
        setIsLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) {
        return
      }

      setSession(nextSession)
      {
        const { actor: nextActor, serverAuthError: nextErr } = await fetchActor(
          nextSession?.access_token
        )
        setActor(nextActor)
        setServerAuthError(nextErr)
      }
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return error?.message || null
    },
    []
  )

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      return error?.message || null
    },
    []
  )

  const signOut = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signOut()

    if (!error) {
      setSession(null)
      setServerAuthError(null)
      await refreshActor()
    }

    return error?.message || null
  }, [refreshActor])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user || null,
      actor,
      serverAuthError,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      isUsingFallbackActor: Boolean(actor && actor.source !== 'supabase-auth'),
      signInWithPassword,
      signUpWithPassword,
      signOut,
      refreshActor,
    }),
    [
      actor,
      isLoading,
      refreshActor,
      serverAuthError,
      session,
      signInWithPassword,
      signOut,
      signUpWithPassword,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
