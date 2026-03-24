/**
 * Perplexity AI API integration
 * Uses the Perplexity Chat Completions API
 */

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
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
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

export async function callPerplexityAI(
  messages: PerplexityMessage[],
  model: string = 'sonar-pro',
  options: {
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set in environment variables')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
  }

  const data: PerplexityResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from Perplexity AI')
  }

  return data.choices[0].message.content
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

  const response = await callPerplexityAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    'sonar-pro',
    {
      temperature: 0.1,
      maxTokens: 3000,
    }
  )

  return parseBrdEvidenceResponse(response)
}

async function composeBrdWithPerplexity(evidence: BrdEvidence): Promise<string> {
  const { systemPrompt, userPrompt } = await buildBRDCompositionPrompt(evidence)

  return callPerplexityAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    'sonar-pro',
    {
      temperature: 0.2,
      maxTokens: 4000,
    }
  )
}

/**
 * Generate BRD using Perplexity AI
 */
export async function generateBRDWithPerplexity(content: string): Promise<string> {
  const evidence = await extractBrdEvidenceWithPerplexity(content, 'input')
  const composedHtml = await composeBrdWithPerplexity(evidence)

  return finalizeBrdHtml(composedHtml, evidence).html
}

/**
 * Generate improved BRD from an uploaded file using Perplexity AI
 * This function takes an existing BRD file and enhances/improves it
 */
export async function generateBRDFromFile(fileContent: string): Promise<string> {
  const evidence = await extractBrdEvidenceWithPerplexity(
    fileContent,
    'existing-brd'
  )
  const composedHtml = await composeBrdWithPerplexity(evidence)

  return finalizeBrdHtml(composedHtml, evidence).html
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
  }>
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

  const response = await callPerplexityAI(messages, 'sonar-pro', {
    temperature: 0.1,
    maxTokens: 4000,
  })

  try {
    return parseSprintPlanResponse(response)
  } catch (error) {
    console.error('Error parsing Perplexity response:', error)
    console.error('Response received:', response)
    throw new Error(`Failed to parse sprint plan from Perplexity AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
