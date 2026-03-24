'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import LoadingSpinner from '@/components/LoadingSpinner'
import { useAuth } from '@/components/auth/AuthProvider'

export default function Home() {
  const router = useRouter()
  const { actor, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated || actor ? '/dashboard' : '/auth')
    }
  }, [actor, isAuthenticated, isLoading, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
