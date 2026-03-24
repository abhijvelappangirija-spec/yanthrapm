import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import {
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { brdId: string } }
) {
  try {
    const { brdId } = params
    const actor = await resolveRequestActor(request)
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error } = await supabase
      .from('technical_context')
      .select('*')
      .eq('brd_id', brdId)
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
        { error: 'Failed to fetch technical context' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      technicalContext: data?.technical_context || null,
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching technical context:', error)

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
