import { NextRequest, NextResponse } from 'next/server'
import { classifyAiInput } from '@/lib/ai/input-classification'
import { AiPolicyError } from '@/lib/ai/provider-policy'
import { resolveRetrievalPolicy } from '@/lib/ai/retrieval-policy'
import { generateBRDFromFileWithPolicy } from '@/lib/ai/service'
import { sanitizeGeneratedHtml } from '@/lib/security/html'
import {
  getOptionalDevErrorCause,
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import {
  RequestValidationError,
  readBooleanField,
  readRequiredStringField,
  requireObjectPayload,
} from '@/lib/security/request-validation'

export async function POST(request: NextRequest) {
  try {
    const payload = requireObjectPayload(await request.json())
    const fileContent = readRequiredStringField(payload, 'fileContent', {
      maxLength: 100000,
    })
    const useDummyData = readBooleanField(payload, 'useDummyData', false)
    const requirePrivateProcessing = readBooleanField(
      payload,
      'requirePrivateProcessing',
      false
    )
    const classification = classifyAiInput(fileContent)
    const effectiveRequirePrivateProcessing =
      requirePrivateProcessing || classification.requirePrivateProcessing
    const retrievalPolicy = resolveRetrievalPolicy({
      task: 'brd-from-file',
      classification,
      requirePrivateProcessing: effectiveRequirePrivateProcessing,
    })

    // Generate improved BRD using Perplexity AI or dummy data
    const { content: brdText, ai, retrievalExecution, governance } =
      await generateBRDFromFileWithPolicy({
        fileContent,
        useDummyData,
        requirePrivateProcessing: effectiveRequirePrivateProcessing,
        retrievalPolicy,
      })

    const sanitizedBrdText = sanitizeGeneratedHtml(brdText)

    return NextResponse.json({
      success: true,
      brd: sanitizedBrdText,
      provider: ai.provider,
      ai,
      classification,
      retrievalPolicy,
      retrievalExecution,
      governance,
    })
  } catch (error) {
    if (
      error instanceof AiPolicyError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error generating BRD from file:', error)

    if (isConnectivityError(error)) {
      const cause = getOptionalDevErrorCause(error)
      return NextResponse.json(
        {
          error: `${getPublicServiceErrorMessage('AI provider', error)} Enable dummy data for local testing or fix the network/TLS configuration.`,
          ...(cause ? { cause } : {}),
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
