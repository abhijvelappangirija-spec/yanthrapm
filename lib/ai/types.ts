import type { BrdProviderResult } from '@/lib/ai/brd-retrieval'

export type AiTask = 'brd' | 'brd-from-file' | 'sprint-plan'

export type AiProviderName = 'dummy' | 'ollama' | 'perplexity'

export type AiRoutingReason =
  | 'dummy-data-requested'
  | 'private-policy-enforced'
  | 'task-specific-provider'
  | 'default-provider'

export type BrdGenerationOptions = {
  retrievalPolicy?: import('@/lib/ai/retrieval-policy').RetrievalPolicyDecision
}

export type SprintPlanGenerationInput = {
  brdText: string
  technicalContext?: string
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  velocity?: number
  resources?: Array<{
    name: string
    role: string
    tech_stack?: string
    capacity: number
  }>
  retrievalPolicy?: import('@/lib/ai/retrieval-policy').RetrievalPolicyDecision
}

export type AiGenerationMetadata = {
  provider: AiProviderName
  model: string
  task: AiTask
  isExternal: boolean
  routingReason: AiRoutingReason
  generatedAt: string
  /** Evidence/composition/retrieval prompt bundle version for audits. */
  promptPackageVersion?: string
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

export interface AiProvider {
  readonly name: AiProviderName
  readonly isExternal: boolean
  getModel(task: AiTask): string
  generateBRD(
    content: string,
    options?: BrdGenerationOptions
  ): Promise<BrdProviderResult>
  generateBRDFromFile(
    fileContent: string,
    options?: BrdGenerationOptions
  ): Promise<BrdProviderResult>
  generateSprintPlan(input: SprintPlanGenerationInput): Promise<SprintPlan>
}
