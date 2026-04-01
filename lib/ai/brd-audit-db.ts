import type { BrdGovernancePayload } from '@/lib/ai/brd-governance'
import type { BrdRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'

/** Shrink nested arrays for JSONB storage caps. */
export function serializeBrdGovernanceForDb(
  input: BrdGovernancePayload
): Record<string, unknown> {
  return {
    promptPackageVersion: input.promptPackageVersion,
    reviewMarkers: input.reviewMarkers,
    validation: {
      score: input.validation.score,
      missingSections: input.validation.missingSections,
      missingEvidenceReferences: input.validation.missingEvidenceReferences.slice(0, 40),
      repaired: input.validation.repaired,
      unsupportedClaims: input.validation.unsupportedClaims.slice(0, 25),
    },
  }
}

export function serializeBrdRetrievalExecutionForDb(
  input: BrdRetrievalExecutionMeta
): Record<string, unknown> {
  return {
    attempted: input.attempted,
    performed: input.performed,
    skippedReason: input.skippedReason,
    useCase: input.useCase,
    sanitizedQuery: input.sanitizedQuery?.slice(0, 500),
    retrievedAt: input.retrievedAt,
    facts: (input.facts ?? []).slice(0, 40),
    sources: (input.sources ?? []).slice(0, 40),
  }
}
