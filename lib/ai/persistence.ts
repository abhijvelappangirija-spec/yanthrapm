import { PostgrestError } from '@supabase/supabase-js'

import {
  serializeBrdGovernanceForDb,
  serializeBrdRetrievalExecutionForDb,
} from '@/lib/ai/brd-audit-db'
import type { BrdGovernancePayload } from '@/lib/ai/brd-governance'
import type { BrdRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'
import { AiGenerationMetadata, AiProviderName, AiRoutingReason, AiTask } from '@/lib/ai/types'
import {
  RequestValidationError,
  readRequiredStringField,
  readStringField,
  requireObjectPayload,
} from '@/lib/security/request-validation'

const AI_METADATA_COLUMNS = [
  'ai_provider',
  'ai_model',
  'ai_task',
  'ai_is_external',
  'ai_generated_at',
] as const

const AUDIT_SNAPSHOT_COLUMNS = [
  'ai_prompt_package_version',
  'brd_governance',
  'brd_retrieval_execution',
] as const

const ALL_OPTIONAL_BR_STORAGE_COLUMNS = [
  ...AI_METADATA_COLUMNS,
  ...AUDIT_SNAPSHOT_COLUMNS,
] as const

export const BRD_LIST_SELECT_FULL = [
  'id',
  'user_id',
  'raw_input',
  'brd_text',
  'created_at',
  ...AI_METADATA_COLUMNS,
  ...AUDIT_SNAPSHOT_COLUMNS,
].join(', ')

export const BRD_LIST_SELECT_AI = [
  'id',
  'user_id',
  'raw_input',
  'brd_text',
  'created_at',
  ...AI_METADATA_COLUMNS,
].join(', ')

export const BRD_LIST_SELECT_BASE =
  'id, user_id, raw_input, brd_text, created_at'

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

function storageDiagnosticText(error: PostgrestError | null): string {
  if (!error) {
    return ''
  }

  return [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
}

function isMissingAiMetadataColumnError(error: PostgrestError | null): boolean {
  if (!error) {
    return false
  }

  const diagnosticText = storageDiagnosticText(error)

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

function isMissingOptionalBrStorageColumnError(error: PostgrestError | null): boolean {
  if (!error) {
    return false
  }

  const diagnosticText = storageDiagnosticText(error)

  const mentionsOptional = ALL_OPTIONAL_BR_STORAGE_COLUMNS.some((column) =>
    diagnosticText.includes(column)
  )

  return (
    mentionsOptional &&
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

export function buildBrdInsertAuditExtension(input: {
  includeAiMetadata: boolean
  includeAuditSnapshot: boolean
  ai: AiGenerationMetadata
  governance: BrdGovernancePayload | null
  retrievalExecution: BrdRetrievalExecutionMeta
}): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  if (!input.includeAiMetadata) {
    return out
  }

  Object.assign(out, buildAiMetadataColumns(input.ai))

  if (!input.includeAuditSnapshot) {
    return out
  }

  if (input.ai.promptPackageVersion) {
    out.ai_prompt_package_version = input.ai.promptPackageVersion
  }

  if (input.governance) {
    out.brd_governance = serializeBrdGovernanceForDb(input.governance)
  }

  const re = input.retrievalExecution
  if (
    re.attempted ||
    re.performed ||
    (re.facts?.length ?? 0) > 0 ||
    (re.sources?.length ?? 0) > 0
  ) {
    out.brd_retrieval_execution = serializeBrdRetrievalExecutionForDb(re)
  }

  return out
}

export async function executeWithOptionalBrdInsertAudit<T>(
  runQuery: (
    includeAiMetadata: boolean,
    includeAuditSnapshot: boolean
  ) => PromiseLike<QueryResult<T>>
): Promise<
  QueryResult<T> & { aiMetadataSaved: boolean; auditSnapshotSaved: boolean }
> {
  let result = await runQuery(true, true)

  if (!result.error) {
    return {
      ...result,
      aiMetadataSaved: true,
      auditSnapshotSaved: true,
    }
  }

  if (!isMissingOptionalBrStorageColumnError(result.error)) {
    return {
      ...result,
      aiMetadataSaved: false,
      auditSnapshotSaved: false,
    }
  }

  console.warn(
    'BRD audit snapshot or AI columns missing in Supabase; retrying insert without governance/retrieval JSON.'
  )

  result = await runQuery(true, false)

  if (!result.error) {
    return {
      ...result,
      aiMetadataSaved: true,
      auditSnapshotSaved: false,
    }
  }

  if (!isMissingOptionalBrStorageColumnError(result.error)) {
    return {
      ...result,
      aiMetadataSaved: false,
      auditSnapshotSaved: false,
    }
  }

  console.warn(
    'AI metadata columns missing in Supabase; retrying BRD insert without AI metadata.'
  )

  result = await runQuery(false, false)

  return {
    ...result,
    aiMetadataSaved: false,
    auditSnapshotSaved: false,
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

export async function executeReadWithOptionalBrdListColumns<T>(
  runQuery: (select: string) => PromiseLike<QueryResult<T>>
): Promise<
  QueryResult<T> & { aiMetadataAvailable: boolean; auditSnapshotAvailable: boolean }
> {
  let result = await runQuery(BRD_LIST_SELECT_FULL)

  if (!result.error) {
    return {
      ...result,
      aiMetadataAvailable: true,
      auditSnapshotAvailable: true,
    }
  }

  if (!isMissingOptionalBrStorageColumnError(result.error)) {
    return {
      ...result,
      aiMetadataAvailable: false,
      auditSnapshotAvailable: false,
    }
  }

  console.warn(
    'BRD list audit columns missing in Supabase; retrying list select without governance JSON.'
  )

  result = await runQuery(BRD_LIST_SELECT_AI)

  if (!result.error) {
    return {
      ...result,
      aiMetadataAvailable: true,
      auditSnapshotAvailable: false,
    }
  }

  if (!isMissingOptionalBrStorageColumnError(result.error)) {
    return {
      ...result,
      aiMetadataAvailable: false,
      auditSnapshotAvailable: false,
    }
  }

  console.warn('BRD list AI columns missing in Supabase; retrying base list columns.')

  result = await runQuery(BRD_LIST_SELECT_BASE)

  return {
    ...result,
    aiMetadataAvailable: false,
    auditSnapshotAvailable: false,
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

  const promptPackageVersion = readStringField(value, 'promptPackageVersion', {
    required: false,
    maxLength: 48,
  })

  return {
    provider: provider as AiProviderName,
    model,
    task: task as AiTask,
    isExternal,
    routingReason: routingReason as AiRoutingReason,
    generatedAt,
    ...(promptPackageVersion ? { promptPackageVersion } : {}),
  }
}
