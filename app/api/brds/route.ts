import { NextRequest, NextResponse } from 'next/server'

import { executeReadWithOptionalBrdListColumns } from '@/lib/ai/persistence'
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
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error, aiMetadataAvailable, auditSnapshotAvailable } =
      await executeReadWithOptionalBrdListColumns((selectList) =>
        supabase
          .from('brds')
          .select(selectList)
          .eq('user_id', actor.userId)
          .order('created_at', { ascending: false })
      )

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json({
          success: true,
          brds: [],
          storageAvailable: false,
          aiMetadataAvailable: false,
          auditSnapshotAvailable: false,
          warning: getPublicServiceErrorMessage('Supabase storage', error),
        })
      }

      return NextResponse.json(
        { error: 'Failed to fetch BRDs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      brds: data || [],
      aiMetadataAvailable,
      auditSnapshotAvailable,
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching BRDs:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json({
        success: true,
        brds: [],
        storageAvailable: false,
        aiMetadataAvailable: false,
        auditSnapshotAvailable: false,
        warning: getPublicServiceErrorMessage('Supabase storage', error),
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
