import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import { sanitizeRichTextHtml } from '@/lib/security/html'
import {
  RequestValidationError,
  readRequiredStringField,
  requireObjectPayload,
} from '@/lib/security/request-validation'
import {
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)
    const payload = requireObjectPayload(await request.json())
    const id = readRequiredStringField(payload, 'id', { maxLength: 200 })
    const brdText = readRequiredStringField(payload, 'brd_text', {
      maxLength: 150000,
      trim: false,
    })
    const sanitizedBrdText = sanitizeRichTextHtml(brdText)
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error } = await supabase
      .from('brds')
      .update({ brd_text: sanitizedBrdText })
      .eq('id', id)
      .eq('user_id', actor.userId)
      .select()
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
        { error: 'Failed to update BRD' },
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
    if (
      error instanceof ActorResolutionError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error updating BRD:', error)

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
