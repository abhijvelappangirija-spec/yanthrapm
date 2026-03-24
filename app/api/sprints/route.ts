import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import {
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)
    const { searchParams } = new URL(request.url)
    const brdId = searchParams.get('brdId')
    const supabase = createActorScopedSupabaseClient(request)

    let query = supabase
      .from('sprints')
      .select('*')
      .eq('user_id', actor.userId)
      .order('created_at', { ascending: false })

    if (brdId) {
      query = query.eq('brd_id', brdId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json({
          success: true,
          sprints: [],
          storageAvailable: false,
          warning: getPublicServiceErrorMessage('Supabase storage', error),
        })
      }

      return NextResponse.json(
        { error: 'Failed to fetch sprints' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sprints: data || [],
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching sprints:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json({
        success: true,
        sprints: [],
        storageAvailable: false,
        warning: getPublicServiceErrorMessage('Supabase storage', error),
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
