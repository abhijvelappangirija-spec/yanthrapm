'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/components/auth/AuthProvider'

type AuthMode = 'sign-in' | 'sign-up'

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { actor, isAuthenticated, isLoading, isUsingFallbackActor, signInWithPassword, signUpWithPassword } = useAuth()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nextPath = searchParams?.get('next') || '/dashboard'

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(nextPath)
    }
  }, [isAuthenticated, isLoading, nextPath, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    const normalizedEmail = email.trim()
    const normalizedPassword = password.trim()

    if (!normalizedEmail || !normalizedPassword) {
      setError('Email and password are required.')
      setIsSubmitting(false)
      return
    }

    const authError =
      mode === 'sign-in'
        ? await signInWithPassword(normalizedEmail, normalizedPassword)
        : await signUpWithPassword(normalizedEmail, normalizedPassword)

    setIsSubmitting(false)

    if (authError) {
      setError(authError)
      return
    }

    if (mode === 'sign-up') {
      setMessage(
        'Sign-up request submitted. If email confirmation is enabled, verify the inbox before signing in.'
      )
      return
    }

    router.replace(nextPath)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 px-4 py-12">
      <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Private-first BRD</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
            Sign in to use protected BRD, sprint, and project workflows.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
            The app now supports real Supabase-backed sessions for API ownership checks.
            Sign in here to replace the local fallback path with an authenticated actor.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-sm font-semibold text-white">What sign-in changes</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                API requests carry your Supabase access token, and server routes bind reads and
                writes to that authenticated user.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-sm font-semibold text-white">Fallback mode</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Development fallback can still exist locally. Use this page to verify the real
                session path before production rollout.
              </p>
            </div>
          </div>

          {isUsingFallbackActor && actor && (
            <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100">
              Current fallback actor: <span className="font-semibold">{actor.userId}</span>
            </div>
          )}

          <div className="mt-10 text-sm text-slate-400">
            Need to inspect the resolved server actor? Check
            {' '}
            <code className="rounded bg-black/30 px-2 py-1 text-slate-200">/api/auth/actor</code>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 text-slate-900 shadow-2xl shadow-black/30">
          <div className="flex gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'sign-in' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'sign-up' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 transition focus:border-slate-400"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="password"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-0 transition focus:border-slate-400"
                placeholder="Minimum 6-8 characters based on your Supabase rules"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? mode === 'sign-in'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'sign-in'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-500">
            Return to
            {' '}
            <Link href="/dashboard" className="font-medium text-slate-900 underline">
              dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
      <AuthPageContent />
    </Suspense>
  )
}
