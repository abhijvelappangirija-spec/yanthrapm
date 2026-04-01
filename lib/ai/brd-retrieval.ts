import type { BrdGovernancePayload } from '@/lib/ai/brd-governance'
import { parseJsonObject } from '@/lib/ai/json-parser'
import {
  RetrievalPolicyDecision,
  RetrievalUseCase,
} from '@/lib/ai/retrieval-policy'

export type BrdRetrievalSource = {
  url: string
  retrievedAt: string
}

export type BrdExternalRetrievalSnapshot = {
  retrievedAt: string
  useCase: RetrievalUseCase
  sanitizedQuery: string
  facts: string[]
  sources: BrdRetrievalSource[]
}

export type BrdRetrievalExecutionMeta = {
  attempted: boolean
  performed: boolean
  skippedReason?: string
  useCase?: RetrievalUseCase
  sanitizedQuery?: string
  retrievedAt?: string
  facts: string[]
  sources: BrdRetrievalSource[]
}

export type BrdProviderResult = {
  content: string
  retrievalExecution: BrdRetrievalExecutionMeta
  governance?: BrdGovernancePayload
}

export function emptyRetrievalExecutionMeta(): BrdRetrievalExecutionMeta {
  return {
    attempted: false,
    performed: false,
    facts: [],
    sources: [],
  }
}

function normalizeHostname(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, '')
}

export function filterUrlsByApprovedDomains(
  urls: string[],
  approvedDomains: string[]
): string[] {
  const approved = approvedDomains.map((d) => normalizeHostname(d)).filter(Boolean)
  if (approved.length === 0) {
    return []
  }

  const kept: string[] = []

  urls.forEach((raw) => {
    try {
      const host = normalizeHostname(new URL(raw).hostname)
      const ok = approved.some(
        (domain) => host === domain || host.endsWith(`.${domain}`)
      )
      if (ok) {
        kept.push(raw)
      }
    } catch {
      // ignore invalid URLs
    }
  })

  return Array.from(new Set(kept))
}

export function buildBrdRetrievalMessages(input: {
  sanitizedQuery: string
  useCase: RetrievalUseCase
}): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: `You are a research assistant gathering reference material for business requirements planning.

Rules:
- Use web search only as enabled by the API; stay factual and concise.
- Return valid JSON only. No markdown, backticks, or commentary.
- Each fact must be a short, verifiable statement useful for BRD context (standards, controls, or product facts).
- Do not include PII, credentials, or customer-specific data.
- If you cannot ground a statement, omit it.

Return this exact JSON shape:
{
  "facts": ["string"]
}`,
    userPrompt: `Use case: ${input.useCase}

Research query:
${input.sanitizedQuery}`,
  }
}

export function parseBrdRetrievalFactsResponse(response: string): string[] {
  const raw = parseJsonObject<Record<string, unknown>>(response)
  const facts = raw.facts

  if (!Array.isArray(facts)) {
    return []
  }

  return facts
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 24)
}

export function buildRetrievalSnapshot(input: {
  policy: RetrievalPolicyDecision
  useCase: RetrievalUseCase
  sanitizedQuery: string
  facts: string[]
  citationUrls: string[]
  retrievedAt: string
}): BrdExternalRetrievalSnapshot {
  const allowed = filterUrlsByApprovedDomains(
    input.citationUrls,
    input.policy.approvedDomains
  )
  const sources: BrdRetrievalSource[] = allowed.map((url) => ({
    url,
    retrievedAt: input.retrievedAt,
  }))

  return {
    retrievedAt: input.retrievedAt,
    useCase: input.useCase,
    sanitizedQuery: input.sanitizedQuery,
    facts: input.facts,
    sources,
  }
}

export function buildBrdRetrievalExecutionMeta(input: {
  policy: RetrievalPolicyDecision
  snapshot: BrdExternalRetrievalSnapshot | null
  skipReason?: string
}): BrdRetrievalExecutionMeta {
  if (!input.policy.enabled) {
    return {
      attempted: true,
      performed: false,
      skippedReason: input.policy.reason,
      facts: [],
      sources: [],
    }
  }

  if (!input.snapshot) {
    return {
      attempted: true,
      performed: false,
      skippedReason:
        input.skipReason || 'Controlled retrieval did not produce traceable results.',
      facts: [],
      sources: [],
    }
  }

  return {
    attempted: true,
    performed: true,
    useCase: input.snapshot.useCase,
    sanitizedQuery: input.snapshot.sanitizedQuery,
    retrievedAt: input.snapshot.retrievedAt,
    facts: input.snapshot.facts,
    sources: input.snapshot.sources,
  }
}
