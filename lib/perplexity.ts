/**
 * Perplexity AI API integration
 * Uses the Perplexity Chat Completions API
 */

import {
  buildBrdRetrievalExecutionMeta,
  buildBrdRetrievalMessages,
  buildRetrievalSnapshot,
  BrdExternalRetrievalSnapshot,
  BrdProviderResult,
  emptyRetrievalExecutionMeta,
  parseBrdRetrievalFactsResponse,
} from '@/lib/ai/brd-retrieval'
import {
  RetrievalPolicyDecision,
  RetrievalUseCase,
} from '@/lib/ai/retrieval-policy'
import { buildTemplatedRetrievalQuery } from '@/lib/ai/retrieval-sanitization'
import {
  buildBRDCompositionPrompt,
  buildBRDEvidenceExtractionPrompt,
  buildSprintPlanPromptInput,
} from '@/lib/ai/task-prompts'
import {
  BrdEvidence,
  buildDummyBrdEvidence,
  parseBrdEvidenceResponse,
  renderBrdHtmlFromEvidence,
} from '@/lib/ai/brd-evidence'
import { buildBrdGovernancePayload } from '@/lib/ai/brd-governance'
import { finalizeBrdHtml } from '@/lib/ai/brd-validator'
import { parseSprintPlanResponse } from '@/lib/ai/sprint-plan-parser'

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
  }>
  citations?: string[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

type PerplexityChatOptions = {
  temperature?: number
  maxTokens?: number
  disableSearch?: boolean
  searchDomainFilter?: string[]
}

export type SprintPlan = {
  storyGroups: Array<{
    epic: string
    stories: string[]
    storyPoints: number
  }>
  storiesCount: number
  suggestedStoryPoints: number
  sprintBreakdown: Array<{
    sprint: number
    stories: string[]
    totalStoryPoints: number
    capacity: number
    qaTasks?: string[]
    qaHours?: number
    pmTasks?: string[]
    pmHours?: number
    architectTasks?: string[]
    architectHours?: number
  }>
}

export async function callPerplexityChat(
  messages: PerplexityMessage[],
  model: string = 'sonar-pro',
  options: PerplexityChatOptions = {}
): Promise<{ content: string; citations: string[]; retrievedAt: string }> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set in environment variables')
  }

  const retrievedAt = new Date().toISOString()
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4000,
  }

  if (options.disableSearch === true) {
    body.disable_search = true
  }

  if (options.searchDomainFilter?.length) {
    body.search_domain_filter = options.searchDomainFilter
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
  }

  const data: PerplexityResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from Perplexity AI')
  }

  const citations = Array.isArray(data.citations)
    ? data.citations.filter((item): item is string => typeof item === 'string')
    : []

  return {
    content: data.choices[0].message.content,
    citations,
    retrievedAt,
  }
}

export async function callPerplexityAI(
  messages: PerplexityMessage[],
  model: string = 'sonar-pro',
  options: PerplexityChatOptions = {}
): Promise<string> {
  const result = await callPerplexityChat(messages, model, options)
  return result.content
}

export function generateDummyBRD(content: string): string {
  return renderBrdHtmlFromEvidence(buildDummyBrdEvidence(content, 'input'))
}

export function generateDummySprintPlan(
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number
): SprintPlan {
  const calculatedCapacity = velocity || Math.max(1, Math.floor((teamMembers * capacityPerMember * sprintDuration) / 8))
  const storyGroups = [
    {
      epic: 'Requirements and Scope Alignment',
      stories: [
        'Document business goals and scope boundaries',
        'Validate assumptions and open questions with stakeholders',
      ],
      storyPoints: 8,
    },
    {
      epic: 'Core Delivery Planning',
      stories: [
        'Define implementation-ready functional requirements',
        'Capture non-functional and security requirements',
      ],
      storyPoints: 13,
    },
  ]

  return {
    storyGroups,
    storiesCount: storyGroups.reduce((sum, group) => sum + group.stories.length, 0),
    suggestedStoryPoints: storyGroups.reduce((sum, group) => sum + group.storyPoints, 0),
    sprintBreakdown: [
      {
        sprint: 1,
        stories: storyGroups[0].stories,
        totalStoryPoints: storyGroups[0].storyPoints,
        capacity: calculatedCapacity,
      },
      {
        sprint: 2,
        stories: storyGroups[1].stories,
        totalStoryPoints: storyGroups[1].storyPoints,
        capacity: calculatedCapacity,
      },
    ],
  }
}

async function extractBrdEvidenceWithPerplexity(
  content: string,
  sourceType: 'input' | 'existing-brd'
): Promise<BrdEvidence> {
  const { systemPrompt, userPrompt } = await buildBRDEvidenceExtractionPrompt({
    content,
    sourceType,
  })

  const response = await callPerplexityChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    'sonar-pro',
    {
      temperature: 0.1,
      maxTokens: 3000,
      disableSearch: true,
    }
  )

  return parseBrdEvidenceResponse(response.content)
}

async function composeBrdWithPerplexity(
  evidence: BrdEvidence,
  externalRetrieval?: BrdExternalRetrievalSnapshot
): Promise<string> {
  const { systemPrompt, userPrompt } = await buildBRDCompositionPrompt(
    evidence,
    externalRetrieval
  )

  const response = await callPerplexityChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    'sonar-pro',
    {
      temperature: 0.2,
      maxTokens: 4000,
      disableSearch: true,
    }
  )

  return response.content
}

const RETRIEVAL_USE_CASE_PRIORITY: RetrievalUseCase[] = [
  'industry-standards',
  'compliance-controls',
  'technology-docs',
  'integration-docs',
  'delivery-benchmarks',
]

function pickRetrievalUseCase(allowed: RetrievalUseCase[]): RetrievalUseCase | undefined {
  return RETRIEVAL_USE_CASE_PRIORITY.find((candidate) => allowed.includes(candidate))
}

async function runControlledRetrievalForBrd(input: {
  policy: RetrievalPolicyDecision
  evidence: BrdEvidence
}): Promise<{
  snapshot: BrdExternalRetrievalSnapshot | null
  skipReason?: string
}> {
  const useCase = pickRetrievalUseCase(input.policy.allowedUseCases)

  if (!useCase) {
    return {
      snapshot: null,
      skipReason: 'No allowed retrieval use cases are configured for this task.',
    }
  }

  const topic = `${input.evidence.projectName} ${input.evidence.problemStatement}`.slice(
    0,
    240
  )
  const preflight = buildTemplatedRetrievalQuery({
    policy: input.policy,
    useCase,
    topic,
  })

  if (!preflight.allowed) {
    return {
      snapshot: null,
      skipReason: preflight.blockedReasons.join('; '),
    }
  }

  const { systemPrompt, userPrompt } = buildBrdRetrievalMessages({
    sanitizedQuery: preflight.sanitizedQuery,
    useCase,
  })

  const chat = await callPerplexityChat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    'sonar-pro',
    {
      temperature: 0.1,
      maxTokens: 2000,
      searchDomainFilter: input.policy.approvedDomains,
    }
  )

  const facts = parseBrdRetrievalFactsResponse(chat.content)

  if (facts.length === 0) {
    return {
      snapshot: null,
      skipReason: 'Retrieval returned no parseable reference facts.',
    }
  }

  const snapshot = buildRetrievalSnapshot({
    policy: input.policy,
    useCase,
    sanitizedQuery: preflight.sanitizedQuery,
    facts,
    citationUrls: chat.citations,
    retrievedAt: chat.retrievedAt,
  })

  return { snapshot }
}

/**
 * Generate BRD using Perplexity AI
 */
export async function generateBRDWithPerplexity(
  content: string,
  retrievalPolicy?: RetrievalPolicyDecision
): Promise<BrdProviderResult> {
  const evidence = await extractBrdEvidenceWithPerplexity(content, 'input')

  let external: BrdExternalRetrievalSnapshot | null = null
  let skipReason: string | undefined

  if (retrievalPolicy?.enabled) {
    try {
      const outcome = await runControlledRetrievalForBrd({
        policy: retrievalPolicy,
        evidence,
      })
      external = outcome.snapshot
      skipReason = outcome.skipReason
    } catch (error) {
      skipReason =
        error instanceof Error ? error.message : 'Controlled retrieval failed.'
    }
  }

  const composedHtml = await composeBrdWithPerplexity(evidence, external ?? undefined)
  const finalized = finalizeBrdHtml(composedHtml, evidence)
  const governance = buildBrdGovernancePayload(evidence, finalized.validation)

  const retrievalExecution = retrievalPolicy
    ? buildBrdRetrievalExecutionMeta({
        policy: retrievalPolicy,
        snapshot: external,
        skipReason,
      })
    : emptyRetrievalExecutionMeta()

  return {
    content: finalized.html,
    retrievalExecution,
    governance,
  }
}

/**
 * Generate improved BRD from an uploaded file using Perplexity AI
 * This function takes an existing BRD file and enhances/improves it
 */
export async function generateBRDFromFile(
  fileContent: string,
  retrievalPolicy?: RetrievalPolicyDecision
): Promise<BrdProviderResult> {
  const evidence = await extractBrdEvidenceWithPerplexity(
    fileContent,
    'existing-brd'
  )

  let external: BrdExternalRetrievalSnapshot | null = null
  let skipReason: string | undefined

  if (retrievalPolicy?.enabled) {
    try {
      const outcome = await runControlledRetrievalForBrd({
        policy: retrievalPolicy,
        evidence,
      })
      external = outcome.snapshot
      skipReason = outcome.skipReason
    } catch (error) {
      skipReason =
        error instanceof Error ? error.message : 'Controlled retrieval failed.'
    }
  }

  const composedHtml = await composeBrdWithPerplexity(evidence, external ?? undefined)
  const finalized = finalizeBrdHtml(composedHtml, evidence)
  const governance = buildBrdGovernancePayload(evidence, finalized.validation)

  const retrievalExecution = retrievalPolicy
    ? buildBrdRetrievalExecutionMeta({
        policy: retrievalPolicy,
        snapshot: external,
        skipReason,
      })
    : emptyRetrievalExecutionMeta()

  return {
    content: finalized.html,
    retrievalExecution,
    governance,
  }
}

/**
 * Generate Sprint Plan using Perplexity AI with Technical Context and Role-Based Planning
 */
export async function generateSprintPlanWithPerplexity(
  brdText: string,
  technicalContext: string = '',
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number,
  resources?: Array<{
    name: string
    role: string
    tech_stack?: string
    capacity: number
  }>,
  retrievalPolicy?: RetrievalPolicyDecision
): Promise<SprintPlan> {
  const { systemPrompt, userPrompt } = await buildSprintPlanPromptInput({
    brdText,
    technicalContext,
    teamMembers,
    capacityPerMember,
    sprintDuration,
    velocity,
    resources,
  })

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const disableSearch = retrievalPolicy ? !retrievalPolicy.enabled : true

  const response = await callPerplexityAI(messages, 'sonar-pro', {
    temperature: 0.1,
    maxTokens: 4000,
    disableSearch,
  })

  try {
    return parseSprintPlanResponse(response)
  } catch (error) {
    console.error('Error parsing Perplexity response:', error)
    console.error('Response received:', response)
    throw new Error(`Failed to parse sprint plan from Perplexity AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
