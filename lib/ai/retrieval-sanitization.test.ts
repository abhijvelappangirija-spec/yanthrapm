import { describe, expect, it } from 'vitest'

import type { RetrievalPolicyDecision } from '@/lib/ai/retrieval-policy'
import { preflightRetrievalQuery } from '@/lib/ai/retrieval-sanitization'

const testRetrievalPolicy = (): RetrievalPolicyDecision => ({
  enabled: true,
  mode: 'approved-sources-only',
  approvedDomains: ['example.com'],
  allowedUseCases: ['technology-docs'],
  requireSanitizedQueries: true,
  requireSourceTraceability: true,
  reason: 'test policy',
})

describe('preflightRetrievalQuery', () => {
  it('blocks queries that still match restricted patterns after redaction', () => {
    const preflight = preflightRetrievalQuery({
      policy: testRetrievalPolicy(),
      query:
        'password rotation requirements for production systems and access token lifecycle',
    })
    expect(preflight.allowed).toBe(false)
    expect(preflight.blockedReasons.length).toBeGreaterThan(0)
  })

  it('allows a generic templated topic after sanitization', () => {
    const preflight = preflightRetrievalQuery({
      policy: testRetrievalPolicy(),
      query: 'official technical documentation for rest api pagination',
    })
    expect(preflight.allowed).toBe(true)
  })
})
