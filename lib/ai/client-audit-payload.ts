import type { BrdGovernancePayload, BrdReviewWorkflowStatus } from '@/lib/ai/brd-governance'
import type { BrdRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'
import type { RetrievalUseCase } from '@/lib/ai/retrieval-policy'
import type { BrdValidationResult } from '@/lib/ai/brd-validator'
import {
  RequestValidationError,
  readRequiredStringField,
  readStringField,
  requireObjectPayload,
} from '@/lib/security/request-validation'

const WORKFLOW_STATUSES: BrdReviewWorkflowStatus[] = [
  'draft',
  'internal-review',
  'stakeholder-review',
]

const RETRIEVAL_USE_CASES: RetrievalUseCase[] = [
  'industry-standards',
  'compliance-controls',
  'technology-docs',
  'integration-docs',
  'delivery-benchmarks',
]

function parseOptionalUseCase(value: string | undefined): RetrievalUseCase | undefined {
  if (!value) {
    return undefined
  }

  if (!RETRIEVAL_USE_CASES.includes(value as RetrievalUseCase)) {
    throw new RequestValidationError('retrievalExecution.useCase is invalid')
  }

  return value as RetrievalUseCase
}

function readStringArray(value: unknown, label: string, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    throw new RequestValidationError(`${label} must be an array`)
  }

  return value.slice(0, maxItems).map((item, index) => {
    if (typeof item !== 'string') {
      throw new RequestValidationError(`${label}[${index}] must be a string`)
    }

    const trimmed = item.trim()

    if (trimmed.length > 2000) {
      throw new RequestValidationError(`${label}[${index}] exceeds allowed length`)
    }

    return trimmed
  })
}

function parseValidation(value: unknown): BrdValidationResult {
  const v = requireObjectPayload(value)
  const scoreRaw = v.score

  if (typeof scoreRaw !== 'number' || !Number.isFinite(scoreRaw) || scoreRaw < 0 || scoreRaw > 100) {
    throw new RequestValidationError('governance.validation.score must be a number from 0 to 100')
  }

  const missingSections = readStringArray(v.missingSections, 'governance.validation.missingSections', 24)
  const missingEvidenceReferences = readStringArray(
    v.missingEvidenceReferences,
    'governance.validation.missingEvidenceReferences',
    40
  )

  const unsupportedClaimsRaw = v.unsupportedClaims

  if (!Array.isArray(unsupportedClaimsRaw)) {
    throw new RequestValidationError('governance.validation.unsupportedClaims must be an array')
  }

  const unsupportedClaims = unsupportedClaimsRaw.slice(0, 30).map((item, index) => {
    const claim = requireObjectPayload(item)
    return {
      section: readRequiredStringField(claim, 'section', { maxLength: 120 }),
      claim: readRequiredStringField(claim, 'claim', { maxLength: 2000 }),
      reason: readRequiredStringField(claim, 'reason', { maxLength: 2000 }),
    }
  })

  if (typeof v.repaired !== 'boolean') {
    throw new RequestValidationError('governance.validation.repaired must be a boolean')
  }

  return {
    score: Math.round(scoreRaw),
    missingSections,
    missingEvidenceReferences,
    unsupportedClaims,
    repaired: v.repaired,
  }
}

function parseReviewMarkers(value: unknown): BrdGovernancePayload['reviewMarkers'] {
  const m = requireObjectPayload(value)

  if (typeof m.assumptionsReadyForReview !== 'boolean') {
    throw new RequestValidationError('governance.reviewMarkers.assumptionsReadyForReview must be a boolean')
  }

  if (typeof m.risksReadyForReview !== 'boolean') {
    throw new RequestValidationError('governance.reviewMarkers.risksReadyForReview must be a boolean')
  }

  if (typeof m.openQuestionsOutstanding !== 'boolean') {
    throw new RequestValidationError('governance.reviewMarkers.openQuestionsOutstanding must be a boolean')
  }

  const status = readRequiredStringField(m, 'recommendedWorkflowStatus', { maxLength: 32 })

  if (!WORKFLOW_STATUSES.includes(status as BrdReviewWorkflowStatus)) {
    throw new RequestValidationError('governance.reviewMarkers.recommendedWorkflowStatus is invalid')
  }

  return {
    assumptionsReadyForReview: m.assumptionsReadyForReview,
    risksReadyForReview: m.risksReadyForReview,
    openQuestionsOutstanding: m.openQuestionsOutstanding,
    recommendedWorkflowStatus: status as BrdReviewWorkflowStatus,
  }
}

/**
 * Parses optional `governance` from a trusted authenticated client save request.
 * Rejects oversized or malformed objects.
 */
export function parseOptionalBrdGovernancePayload(
  payload: Record<string, unknown>
): BrdGovernancePayload | null {
  const raw = payload.governance

  if (raw === undefined || raw === null) {
    return null
  }

  const encoded = JSON.stringify(raw)

  if (encoded.length > 120_000) {
    throw new RequestValidationError('governance payload is too large')
  }

  const root = requireObjectPayload(raw)

  return {
    promptPackageVersion: readRequiredStringField(root, 'promptPackageVersion', { maxLength: 48 }),
    reviewMarkers: parseReviewMarkers(root.reviewMarkers),
    validation: parseValidation(root.validation),
  }
}

export function parseOptionalRetrievalExecutionPayload(
  payload: Record<string, unknown>
): BrdRetrievalExecutionMeta | null {
  const raw = payload.retrievalExecution

  if (raw === undefined || raw === null) {
    return null
  }

  const encoded = JSON.stringify(raw)

  if (encoded.length > 80_000) {
    throw new RequestValidationError('retrievalExecution payload is too large')
  }

  const r = requireObjectPayload(raw)

  if (typeof r.attempted !== 'boolean') {
    throw new RequestValidationError('retrievalExecution.attempted must be a boolean')
  }

  if (typeof r.performed !== 'boolean') {
    throw new RequestValidationError('retrievalExecution.performed must be a boolean')
  }

  const skippedReason = readStringField(r, 'skippedReason', { maxLength: 2000 })
  const useCaseRaw = readStringField(r, 'useCase', { maxLength: 64 })
  const useCase = parseOptionalUseCase(useCaseRaw)
  const sanitizedQuery = readStringField(r, 'sanitizedQuery', { maxLength: 500 })
  const retrievedAt = readStringField(r, 'retrievedAt', { maxLength: 80 })

  const facts = r.facts === undefined ? [] : readStringArray(r.facts, 'retrievalExecution.facts', 50)

  let sources: BrdRetrievalExecutionMeta['sources'] = []

  if (r.sources !== undefined) {
    if (!Array.isArray(r.sources)) {
      throw new RequestValidationError('retrievalExecution.sources must be an array')
    }

    sources = r.sources.slice(0, 50).map((item) => {
      const s = requireObjectPayload(item)
      const url = readRequiredStringField(s, 'url', { maxLength: 2000 })
      const sRetrievedAt = readStringField(s, 'retrievedAt', { maxLength: 80 })

      return {
        url,
        retrievedAt: sRetrievedAt || new Date().toISOString(),
      }
    })
  }

  return {
    attempted: r.attempted,
    performed: r.performed,
    ...(skippedReason ? { skippedReason } : {}),
    ...(useCase ? { useCase } : {}),
    ...(sanitizedQuery ? { sanitizedQuery } : {}),
    ...(retrievedAt ? { retrievedAt } : {}),
    facts,
    sources,
  }
}
