'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/components/auth/AuthProvider'

export default function RequireAppAccess({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    actor,
    isAuthenticated,
    isLoading,
    isUsingFallbackActor,
    signOut,
    user,
    serverAuthError,
  } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const hasAccess = isAuthenticated || Boolean(actor)

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      const nextPath = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : ''
      router.replace(`/auth${nextPath}`)
    }
  }, [hasAccess, isLoading, pathname, router])

  const identityLabel = useMemo(() => {
    if (user?.email) {
      return user.email
    }

    if (actor?.source === 'configured-default') {
      return `Configured default actor (${actor.userId})`
    }

    if (actor?.source === 'development-fallback') {
      return `Development fallback actor (${actor.userId})`
    }

    return actor?.userId || 'Unknown actor'
  }, [actor, user])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const error = await signOut()
    setIsSigningOut(false)

    if (error) {
      console.error('Error signing out:', error)
      return
    }

    router.push('/auth')
  }

  if (isLoading || !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-600">Checking access...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-slate-950 text-slate-100 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium">{identityLabel}</span>
            {isUsingFallbackActor && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                Fallback access active
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <Link href="/auth" className="text-slate-300 hover:text-white">
                Sign in with Supabase
              </Link>
            )}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            )}
          </div>
        </div>
      </div>
      {isUsingFallbackActor && (
        <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm">
            This screen is running under a fallback actor, not a real signed-in user. Use
            {' '}
            <Link href="/auth" className="font-semibold underline">
              the auth page
            </Link>
            {' '}
            to validate the real session path.
          </div>
        </div>
      )}
      {isAuthenticated && serverAuthError && (
        <div className="border-b border-rose-200 bg-rose-50 text-rose-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm">
            <p className="font-medium">Server could not finish Supabase sign-in checks</p>
            <p className="mt-1 text-rose-900/90">
              Your browser still shows you as signed in, but this app’s API must reach Supabase to
              validate your session. That step failed: {serverAuthError} Typical causes: VPN or
              firewall blocking the machine running Next.js, a paused Supabase project, wrong{' '}
              <code className="rounded bg-rose-100/80 px-1">NEXT_PUBLIC_SUPABASE_URL</code> in{' '}
              <code className="rounded bg-rose-100/80 px-1">.env.local</code>, or TLS/proxy issues on
              the server. After fixing, refresh the page or sign out and sign in again.
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
