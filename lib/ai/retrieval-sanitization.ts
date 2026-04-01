import {
  RetrievalPolicyDecision,
  RetrievalUseCase,
} from '@/lib/ai/retrieval-policy'
import { classifyAiInput } from '@/lib/ai/input-classification'

export type RetrievalQueryPreflight = {
  allowed: boolean
  query: string
  sanitizedQuery: string
  redactions: string[]
  blockedReasons: string[]
}

const QUERY_TEMPLATES: Record<RetrievalUseCase, (topic: string) => string> = {
  'industry-standards': (topic) =>
    `current industry standards and best practices for ${topic}`,
  'compliance-controls': (topic) =>
    `current compliance control expectations for ${topic}`,
  'technology-docs': (topic) =>
    `official technical documentation and current implementation guidance for ${topic}`,
  'integration-docs': (topic) =>
    `official integration requirements and API constraints for ${topic}`,
  'delivery-benchmarks': (topic) =>
    `current delivery planning benchmarks and estimation guidance for ${topic}`,
}

type RedactionRule = {
  label: string
  pattern: RegExp
  replacement: string
}

const REDACTION_RULES: RedactionRule[] = [
  {
    label: 'email address',
    pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    replacement: '[redacted-email]',
  },
  {
    label: 'phone number',
    pattern: /\+?\d[\d\s().-]{8,}\d/g,
    replacement: '[redacted-phone]',
  },
  {
    label: 'URL',
    pattern: /https?:\/\/\S+/gi,
    replacement: '[redacted-url]',
  },
  {
    label: 'UUID',
    pattern:
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    replacement: '[redacted-id]',
  },
  {
    label: 'long access token',
    pattern: /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g,
    replacement: '[redacted-token]',
  },
]

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function sanitizeTopic(topic: string): string {
  return normalizeWhitespace(
    topic
      .replace(/[^\w\s./-]+/g, ' ')
      .replace(/[_/.-]+/g, ' ')
      .toLowerCase()
  )
    .slice(0, 120)
    .trim()
}

export function preflightRetrievalQuery(input: {
  policy: RetrievalPolicyDecision
  query: string
}): RetrievalQueryPreflight {
  const redactions: string[] = []
  const blockedReasons: string[] = []

  if (!input.policy.enabled) {
    blockedReasons.push(input.policy.reason)
  }

  let sanitizedQuery = normalizeWhitespace(input.query).slice(0, 280)

  REDACTION_RULES.forEach((rule) => {
    if (sanitizedQuery.match(rule.pattern)) {
      redactions.push(rule.label)
      sanitizedQuery = sanitizedQuery.replace(rule.pattern, rule.replacement)
    }
  })

  const classification = classifyAiInput(sanitizedQuery)

  if (classification.requirePrivateProcessing) {
    blockedReasons.push(
      'Sanitized retrieval query still contains restricted or sensitive content patterns.'
    )
  }

  if (sanitizedQuery.length < 12) {
    blockedReasons.push('Retrieval query is too short after sanitization.')
  }

  return {
    allowed: blockedReasons.length === 0,
    query: input.query,
    sanitizedQuery,
    redactions: Array.from(new Set(redactions)),
    blockedReasons,
  }
}

export function buildTemplatedRetrievalQuery(input: {
  policy: RetrievalPolicyDecision
  useCase: RetrievalUseCase
  topic: string
}): RetrievalQueryPreflight {
  const safeTopic = sanitizeTopic(input.topic)

  return preflightRetrievalQuery({
    policy: input.policy,
    query: QUERY_TEMPLATES[input.useCase](safeTopic),
  })
}
