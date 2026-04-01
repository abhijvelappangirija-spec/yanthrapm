import { describe, expect, it } from 'vitest'

import {
  parseOptionalBrdGovernancePayload,
  parseOptionalRetrievalExecutionPayload,
} from '@/lib/ai/client-audit-payload'
import { RequestValidationError } from '@/lib/security/request-validation'

describe('parseOptionalBrdGovernancePayload', () => {
  it('returns null when governance is absent', () => {
    expect(parseOptionalBrdGovernancePayload({})).toBeNull()
  })

  it('parses a minimal valid governance object', () => {
    const governance = parseOptionalBrdGovernancePayload({
      governance: {
        promptPackageVersion: '2026.03.26',
        reviewMarkers: {
          assumptionsReadyForReview: true,
          risksReadyForReview: false,
          openQuestionsOutstanding: true,
          recommendedWorkflowStatus: 'internal-review',
        },
        validation: {
          score: 72,
          missingSections: ['Open Questions'],
          missingEvidenceReferences: [],
          unsupportedClaims: [],
          repaired: false,
        },
      },
    })
    expect(governance?.validation.score).toBe(72)
    expect(governance?.reviewMarkers.recommendedWorkflowStatus).toBe('internal-review')
  })

  it('rejects invalid workflow status', () => {
    expect(() =>
      parseOptionalBrdGovernancePayload({
        governance: {
          promptPackageVersion: '1',
          reviewMarkers: {
            assumptionsReadyForReview: true,
            risksReadyForReview: true,
            openQuestionsOutstanding: false,
            recommendedWorkflowStatus: 'invalid',
          },
          validation: {
            score: 80,
            missingSections: [],
            missingEvidenceReferences: [],
            unsupportedClaims: [],
            repaired: false,
          },
        },
      })
    ).toThrow(RequestValidationError)
  })
})

describe('parseOptionalRetrievalExecutionPayload', () => {
  it('returns null when absent', () => {
    expect(parseOptionalRetrievalExecutionPayload({})).toBeNull()
  })

  it('parses performed retrieval with sources', () => {
    const r = parseOptionalRetrievalExecutionPayload({
      retrievalExecution: {
        attempted: true,
        performed: true,
        useCase: 'technology-docs',
        facts: ['Fact one'],
        sources: [{ url: 'https://example.com/doc', retrievedAt: '2026-01-01T00:00:00.000Z' }],
      },
    })
    expect(r?.performed).toBe(true)
    expect(r?.sources[0]?.url).toContain('example.com')
  })
})
