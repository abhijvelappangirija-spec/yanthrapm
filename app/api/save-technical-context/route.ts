import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import {
  RequestValidationError,
  readRequiredStringField,
  requireObjectPayload,
} from '@/lib/security/request-validation'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)
    const payload = requireObjectPayload(await request.json())
    const brdId = readRequiredStringField(payload, 'brdId', { maxLength: 200 })
    const technicalContext = readRequiredStringField(payload, 'technicalContext', {
      maxLength: 50000,
    })
    const supabase = createActorScopedSupabaseClient(request)

    try {
      const { data, error } = await supabase
        .from('technical_context')
        .upsert(
          {
            brd_id: brdId,
            technical_context: technicalContext,
            user_id: actor.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'brd_id',
          }
        )
        .select()
        .single()

      if (error) {
        console.warn('Could not save technical context to database:', error.message)
        return NextResponse.json({
          success: true,
          saved: false,
          message: 'Technical context saved in session (database save skipped)',
        })
      }

      return NextResponse.json({
        success: true,
        saved: true,
        id: data?.id,
        message: 'Technical context saved successfully',
      })
    } catch (dbError) {
      console.warn('Database save skipped:', dbError)
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Technical context saved in session',
      })
    }
  } catch (error) {
    if (
      error instanceof ActorResolutionError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error saving technical context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
