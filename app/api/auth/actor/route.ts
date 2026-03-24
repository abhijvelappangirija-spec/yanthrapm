import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)

    return NextResponse.json({
      authenticated: actor.source === 'supabase-auth',
      actor,
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        {
          authenticated: false,
          error: error.message,
        },
        { status: error.status }
      )
    }

    console.error('Error resolving actor:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
