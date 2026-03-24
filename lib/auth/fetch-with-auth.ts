'use client'

import { supabase } from '@/lib/supabase'

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)

  if (!headers.has('Authorization')) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
    }
  }

  return fetch(input, {
    ...init,
    headers,
  })
}
