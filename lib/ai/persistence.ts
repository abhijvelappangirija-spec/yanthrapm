import { PostgrestError } from '@supabase/supabase-js'

import { AiGenerationMetadata, AiProviderName, AiRoutingReason, AiTask } from '@/lib/ai/types'
import {
  RequestValidationError,
  readRequiredStringField,
  requireObjectPayload,
} from '@/lib/security/request-validation'

const AI_METADATA_COLUMNS = [
  'ai_provider',
  'ai_model',
  'ai_task',
  'ai_is_external',
  'ai_generated_at',
] as const

const VALID_PROVIDERS: AiProviderName[] = ['dummy', 'ollama', 'perplexity']
const VALID_TASKS: AiTask[] = ['brd', 'brd-from-file', 'sprint-plan']
const VALID_ROUTING_REASONS: AiRoutingReason[] = [
  'dummy-data-requested',
  'private-policy-enforced',
  'task-specific-provider',
  'default-provider',
]

type QueryResult<T> = {
  data: T | null
  error: PostgrestError | null
}

function isMissingAiMetadataColumnError(error: PostgrestError | null): boolean {
  if (!error) {
    return false
  }

  const diagnosticText = [error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const mentionsAiMetadataColumn = AI_METADATA_COLUMNS.some((column) =>
    diagnosticText.includes(column)
  )

  return (
    mentionsAiMetadataColumn &&
    (error.code === '42703' ||
      error.code === 'PGRST204' ||
      diagnosticText.includes('column') ||
      diagnosticText.includes('schema cache'))
  )
}

export function buildAiMetadataColumns(ai: AiGenerationMetadata) {
  return {
    ai_provider: ai.provider,
    ai_model: ai.model,
    ai_task: ai.task,
    ai_is_external: ai.isExternal,
    ai_generated_at: ai.generatedAt,
  }
}

export async function executeWithOptionalAiMetadata<T>(
  runQuery: (includeAiMetadata: boolean) => PromiseLike<QueryResult<T>>
): Promise<QueryResult<T> & { aiMetadataSaved: boolean }> {
  const firstAttempt = await runQuery(true)

  if (!firstAttempt.error) {
    return {
      ...firstAttempt,
      aiMetadataSaved: true,
    }
  }

  if (!isMissingAiMetadataColumnError(firstAttempt.error)) {
    return {
      ...firstAttempt,
      aiMetadataSaved: false,
    }
  }

  console.warn(
    'AI metadata columns are not available in Supabase yet. Retrying write without AI metadata.'
  )

  const fallbackAttempt = await runQuery(false)

  return {
    ...fallbackAttempt,
    aiMetadataSaved: false,
  }
}

export async function executeReadWithOptionalAiMetadata<T>(
  runQuery: (includeAiMetadata: boolean) => PromiseLike<QueryResult<T>>
): Promise<QueryResult<T> & { aiMetadataAvailable: boolean }> {
  const firstAttempt = await runQuery(true)

  if (!firstAttempt.error) {
    return {
      ...firstAttempt,
      aiMetadataAvailable: true,
    }
  }

  if (!isMissingAiMetadataColumnError(firstAttempt.error)) {
    return {
      ...firstAttempt,
      aiMetadataAvailable: false,
    }
  }

  console.warn(
    'AI metadata columns are not available for reads in Supabase yet. Retrying read without AI metadata.'
  )

  const fallbackAttempt = await runQuery(false)

  return {
    ...fallbackAttempt,
    aiMetadataAvailable: false,
  }
}

export function parseOptionalAiMetadata(
  payload: Record<string, unknown>,
  fieldName: string = 'ai'
): AiGenerationMetadata | undefined {
  const rawValue = payload[fieldName]

  if (rawValue === undefined || rawValue === null) {
    return undefined
  }

  const value = requireObjectPayload(rawValue)
  const provider = readRequiredStringField(value, 'provider', { maxLength: 40 })
  const model = readRequiredStringField(value, 'model', { maxLength: 200 })
  const task = readRequiredStringField(value, 'task', { maxLength: 40 })
  const routingReason = readRequiredStringField(value, 'routingReason', {
    maxLength: 80,
  })
  const generatedAt = readRequiredStringField(value, 'generatedAt', {
    maxLength: 80,
  })
  const isExternal = value.isExternal

  if (!VALID_PROVIDERS.includes(provider as AiProviderName)) {
    throw new RequestValidationError('ai.provider is invalid')
  }

  if (!VALID_TASKS.includes(task as AiTask)) {
    throw new RequestValidationError('ai.task is invalid')
  }

  if (!VALID_ROUTING_REASONS.includes(routingReason as AiRoutingReason)) {
    throw new RequestValidationError('ai.routingReason is invalid')
  }

  if (typeof isExternal !== 'boolean') {
    throw new RequestValidationError('ai.isExternal must be a boolean')
  }

  return {
    provider: provider as AiProviderName,
    model,
    task: task as AiTask,
    isExternal,
    routingReason: routingReason as AiRoutingReason,
    generatedAt,
  }
}
