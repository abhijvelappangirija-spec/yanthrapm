import { NextRequest, NextResponse } from 'next/server'

import { generateBRDWithPolicy } from '@/lib/ai/service'
import { classifyAiInput } from '@/lib/ai/input-classification'
import { AiPolicyError } from '@/lib/ai/provider-policy'
import {
  buildAiMetadataColumns,
  executeWithOptionalAiMetadata,
} from '@/lib/ai/persistence'
import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import { sanitizeGeneratedHtml } from '@/lib/security/html'
import {
  RequestValidationError,
  readBooleanField,
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
    const content = readRequiredStringField(payload, 'content', { maxLength: 50000 })
    const useDummyData = readBooleanField(payload, 'useDummyData', false)
    const requirePrivateProcessing = readBooleanField(
      payload,
      'requirePrivateProcessing',
      false
    )
    const classification = classifyAiInput(content)
    const effectiveRequirePrivateProcessing =
      requirePrivateProcessing || classification.requirePrivateProcessing

    const { content: brdText, ai } = await generateBRDWithPolicy({
      content,
      useDummyData,
      requirePrivateProcessing: effectiveRequirePrivateProcessing,
    })

    const sanitizedBrdText = sanitizeGeneratedHtml(brdText)
    const supabase = createActorScopedSupabaseClient(request)

    let saved = false
    let savedId: string | null = null
    let warning: string | null = null
    let aiMetadataSaved = false

    try {
      const insertPayload = {
        user_id: actor.userId,
        raw_input: content,
        brd_text: sanitizedBrdText,
        created_at: new Date().toISOString(),
      }

      const { data, error, aiMetadataSaved: metadataPersisted } =
        await executeWithOptionalAiMetadata<{ id: string }>((includeAiMetadata) =>
          supabase
            .from('brds')
            .insert({
              ...insertPayload,
              ...(includeAiMetadata ? buildAiMetadataColumns(ai) : {}),
            })
            .select()
            .single()
        )

      aiMetadataSaved = metadataPersisted

      if (error) {
        console.error('Supabase error:', error)
        warning = getPublicServiceErrorMessage('Supabase storage', error)
      } else if (data) {
        saved = true
        savedId = data.id
      } else {
        warning = 'BRD generated, but the saved record could not be confirmed.'
      }
    } catch (saveError) {
      console.error('Error saving BRD:', saveError)
      warning = getPublicServiceErrorMessage('Supabase storage', saveError)
    }

    return NextResponse.json({
      success: true,
      brd: sanitizedBrdText,
      id: savedId,
      saved,
      warning,
      provider: ai.provider,
      ai,
      aiMetadataSaved,
      classification,
    })
  } catch (error) {
    if (
      error instanceof AiPolicyError ||
      error instanceof ActorResolutionError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error generating BRD:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        {
          error: `${getPublicServiceErrorMessage('AI provider', error)} Enable dummy data for local testing or fix the network/TLS configuration.`,
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
