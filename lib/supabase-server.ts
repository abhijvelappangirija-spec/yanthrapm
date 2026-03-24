import 'server-only'

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getRequestAccessToken } from '@/lib/auth/request-actor'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServerKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseServerKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function createActorScopedSupabaseClient(request: NextRequest) {
  const accessToken = getRequestAccessToken(request)

  if (accessToken && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    })
  }

  return createServerSupabaseClient()
}
