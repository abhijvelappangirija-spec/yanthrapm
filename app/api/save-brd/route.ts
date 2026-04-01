import { NextRequest, NextResponse } from 'next/server'
import { PostgrestError } from '@supabase/supabase-js'

import {
  parseOptionalBrdGovernancePayload,
  parseOptionalRetrievalExecutionPayload,
} from '@/lib/ai/client-audit-payload'
import { emptyRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'
import {
  buildBrdInsertAuditExtension,
  executeWithOptionalBrdInsertAudit,
  parseOptionalAiMetadata,
} from '@/lib/ai/persistence'
import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import { sanitizeRichTextHtml } from '@/lib/security/html'
import {
  RequestValidationError,
  readRequiredStringField,
  readStringField,
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
    const rawInput = readStringField(payload, 'raw_input', { maxLength: 50000, trim: false })
    const brdText = readRequiredStringField(payload, 'brd_text', {
      maxLength: 150000,
      trim: false,
    })
    const sanitizedBrdText = sanitizeRichTextHtml(brdText)
    let ai = parseOptionalAiMetadata(payload)
    const governance = parseOptionalBrdGovernancePayload(payload)
    const retrievalFromClient = parseOptionalRetrievalExecutionPayload(payload)

    if (ai && governance?.promptPackageVersion && !ai.promptPackageVersion) {
      ai = { ...ai, promptPackageVersion: governance.promptPackageVersion }
    }

    const supabase = createActorScopedSupabaseClient(request)

    const insertPayload = {
      user_id: actor.userId,
      raw_input: rawInput || sanitizedBrdText.substring(0, 500),
      brd_text: sanitizedBrdText,
      created_at: new Date().toISOString(),
    }

    const retrievalExecution = retrievalFromClient ?? emptyRetrievalExecutionMeta()

    let data: { id: string } | null = null
    let error: PostgrestError | null = null
    let aiMetadataSaved = false
    let auditSnapshotSaved = false

    if (ai) {
      const result = await executeWithOptionalBrdInsertAudit<{ id: string }>(
        (includeAiMetadata, includeAuditSnapshot) =>
          supabase
            .from('brds')
            .insert({
              ...insertPayload,
              ...buildBrdInsertAuditExtension({
                includeAiMetadata,
                includeAuditSnapshot,
                ai,
                governance,
                retrievalExecution,
              }),
            })
            .select()
            .single()
      )
      data = result.data
      error = result.error
      aiMetadataSaved = result.aiMetadataSaved
      auditSnapshotSaved = result.auditSnapshotSaved
    } else {
      const result = await supabase
        .from('brds')
        .insert(insertPayload)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json(
          { error: getPublicServiceErrorMessage('Supabase storage', error) },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to save BRD' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'BRD saved, but the stored record could not be confirmed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      brd: data,
      aiMetadataSaved,
      auditSnapshotSaved,
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

    console.error('Error saving BRD:', error)

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
