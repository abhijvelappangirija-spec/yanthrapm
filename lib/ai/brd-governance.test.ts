import { describe, expect, it } from 'vitest'

import { buildDummyBrdEvidence } from '@/lib/ai/brd-evidence'
import { buildBrdReviewMarkers } from '@/lib/ai/brd-governance'
import type { BrdValidationResult } from '@/lib/ai/brd-validator'

function baseValidation(
  overrides: Partial<BrdValidationResult> = {}
): BrdValidationResult {
  return {
    score: 88,
    missingSections: [],
    missingEvidenceReferences: [],
    unsupportedClaims: [],
    repaired: false,
    ...overrides,
  }
}

describe('buildBrdReviewMarkers', () => {
  it('recommends stakeholder review when score is high and no open gaps', () => {
    const evidence = buildDummyBrdEvidence('initiative', 'input')
    evidence.openQuestions = []
    const markers = buildBrdReviewMarkers(evidence, baseValidation({ score: 90 }))
    expect(markers.openQuestionsOutstanding).toBe(false)
    expect(markers.recommendedWorkflowStatus).toBe('stakeholder-review')
  })

  it('flags open questions outstanding when evidence lists open questions', () => {
    const evidence = buildDummyBrdEvidence('initiative', 'input')
    evidence.openQuestions = ['Who approves the rollout?']
    const markers = buildBrdReviewMarkers(evidence, baseValidation({ score: 92 }))
    expect(markers.openQuestionsOutstanding).toBe(true)
    expect(markers.recommendedWorkflowStatus).not.toBe('stakeholder-review')
  })

  it('downgrades workflow when unsupported claims exist even at high score', () => {
    const evidence = buildDummyBrdEvidence('initiative', 'input')
    const validation = baseValidation({
      score: 90,
      unsupportedClaims: [
        { section: 'Scope', claim: 'We ship in 1 week', reason: 'No supporting evidence' },
      ],
    })
    const markers = buildBrdReviewMarkers(evidence, validation)
    expect(markers.recommendedWorkflowStatus).not.toBe('stakeholder-review')
  })

  it('marks assumptions ready when register is non-empty and score clears threshold', () => {
    const evidence = buildDummyBrdEvidence('initiative', 'input')
    expect(evidence.assumptions.length).toBeGreaterThan(0)
    const markers = buildBrdReviewMarkers(evidence, baseValidation({ score: 60 }))
    expect(markers.assumptionsReadyForReview).toBe(true)
  })
})
