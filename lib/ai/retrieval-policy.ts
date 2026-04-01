import { AiInputClassification } from '@/lib/ai/input-classification'
import { AiTask } from '@/lib/ai/types'

export type RetrievalUseCase =
  | 'industry-standards'
  | 'compliance-controls'
  | 'technology-docs'
  | 'integration-docs'
  | 'delivery-benchmarks'

export type RetrievalMode = 'disabled' | 'approved-sources-only'

export type RetrievalPolicyDecision = {
  enabled: boolean
  mode: RetrievalMode
  approvedDomains: string[]
  allowedUseCases: RetrievalUseCase[]
  requireSanitizedQueries: boolean
  requireSourceTraceability: boolean
  reason: string
}

const DEFAULT_APPROVED_DOMAINS = [
  'owasp.org',
  'nist.gov',
  'cisa.gov',
  'ietf.org',
  'developer.atlassian.com',
  'supabase.com',
  'docs.ollama.com',
] as const

const DEFAULT_USE_CASES_BY_TASK: Record<AiTask, RetrievalUseCase[]> = {
  brd: [
    'industry-standards',
    'compliance-controls',
    'technology-docs',
    'integration-docs',
  ],
  'brd-from-file': [
    'industry-standards',
    'compliance-controls',
    'technology-docs',
    'integration-docs',
  ],
  'sprint-plan': ['technology-docs', 'integration-docs', 'delivery-benchmarks'],
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

function parseUseCases(value: string | undefined, task: AiTask): RetrievalUseCase[] {
  if (!value?.trim()) {
    return DEFAULT_USE_CASES_BY_TASK[task]
  }

  const useCases = new Set<RetrievalUseCase>()

  value.split(',').forEach((rawValue) => {
    const normalizedValue = rawValue.trim().toLowerCase()

    if (
      normalizedValue === 'industry-standards' ||
      normalizedValue === 'compliance-controls' ||
      normalizedValue === 'technology-docs' ||
      normalizedValue === 'integration-docs' ||
      normalizedValue === 'delivery-benchmarks'
    ) {
      useCases.add(normalizedValue)
    }
  })

  return useCases.size > 0 ? Array.from(useCases) : DEFAULT_USE_CASES_BY_TASK[task]
}

function getApprovedDomains(): string[] {
  const configuredDomains = (process.env.AI_RETRIEVAL_APPROVED_DOMAINS || '')
    .split(',')
    .map(normalizeDomain)
    .filter(Boolean)

  const domains =
    configuredDomains.length > 0 ? configuredDomains : Array.from(DEFAULT_APPROVED_DOMAINS)

  return Array.from(new Set(domains))
}

export function resolveRetrievalPolicy(input: {
  task: AiTask
  classification: AiInputClassification
  requirePrivateProcessing?: boolean
}): RetrievalPolicyDecision {
  const retrievalEnabled = isTruthyEnvFlag(process.env.AI_RETRIEVAL_ENABLED)
  const restrictedInput =
    input.requirePrivateProcessing || input.classification.sensitivity === 'restricted'

  if (!retrievalEnabled) {
    return {
      enabled: false,
      mode: 'disabled',
      approvedDomains: [],
      allowedUseCases: [],
      requireSanitizedQueries: true,
      requireSourceTraceability: true,
      reason: 'External retrieval is disabled by environment policy.',
    }
  }

  if (restrictedInput && !isTruthyEnvFlag(process.env.AI_RETRIEVAL_ALLOW_RESTRICTED)) {
    return {
      enabled: false,
      mode: 'disabled',
      approvedDomains: [],
      allowedUseCases: [],
      requireSanitizedQueries: true,
      requireSourceTraceability: true,
      reason:
        'Restricted or private-processing inputs cannot use external retrieval in this environment.',
    }
  }

  return {
    enabled: true,
    mode: 'approved-sources-only',
    approvedDomains: getApprovedDomains(),
    allowedUseCases: parseUseCases(process.env.AI_RETRIEVAL_ALLOWED_USE_CASES, input.task),
    requireSanitizedQueries: true,
    requireSourceTraceability: true,
    reason: restrictedInput
      ? 'Restricted retrieval is allowed only through sanitized queries to approved sources.'
      : 'Standard retrieval is allowed only through sanitized queries to approved sources.',
  }
}
