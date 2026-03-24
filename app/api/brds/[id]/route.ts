import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import {
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const actor = await resolveRequestActor(request)
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error } = await supabase
      .from('brds')
      .select('*')
      .eq('id', id)
      .eq('user_id', actor.userId)
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json(
          { error: getPublicServiceErrorMessage('Supabase storage', error) },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch BRD' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'BRD not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      brd: data,
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching BRD:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        { error: getPublicServiceErrorMessage('Supabase storage', error) },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
