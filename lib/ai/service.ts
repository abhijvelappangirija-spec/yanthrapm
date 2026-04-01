import { BRD_PROMPT_PACKAGE_VERSION } from '@/lib/ai/brd-pipeline-version'
import type { BrdGovernancePayload } from '@/lib/ai/brd-governance'
import { AiPolicyError, resolveAiRoutingDecision } from '@/lib/ai/provider-policy'
import { dummyAiProvider } from '@/lib/ai/providers/dummy-provider'
import { ollamaAiProvider } from '@/lib/ai/providers/ollama-provider'
import { perplexityAiProvider } from '@/lib/ai/providers/perplexity-provider'
import type { BrdProviderResult } from '@/lib/ai/brd-retrieval'
import { emptyRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'
import {
  AiGenerationMetadata,
  AiProvider,
  AiProviderName,
  AiTask,
  BrdGenerationOptions,
  SprintPlan,
} from '@/lib/ai/types'

const providers: Record<AiProviderName, AiProvider> = {
  dummy: dummyAiProvider,
  ollama: ollamaAiProvider,
  perplexity: perplexityAiProvider,
}

function getProvider(name: AiProviderName): AiProvider {
  return providers[name]
}

function buildAiMetadata(
  provider: AiProvider,
  task: AiTask,
  routingReason: AiGenerationMetadata['routingReason'],
  requiresPrivateProcessing: boolean
): AiGenerationMetadata {
  let model: string

  try {
    model = provider.getModel(task)
  } catch (error) {
    if (requiresPrivateProcessing) {
      throw new AiPolicyError(
        `Private AI processing is required for ${task}, but the selected private provider is not configured correctly.`,
        503
      )
    }

    throw error
  }

  return {
    provider: provider.name,
    model,
    task,
    isExternal: provider.isExternal,
    routingReason,
    generatedAt: new Date().toISOString(),
  }
}

export async function generateBRDWithPolicy(input: {
  content: string
  useDummyData?: boolean
  requirePrivateProcessing?: boolean
  retrievalPolicy?: BrdGenerationOptions['retrievalPolicy']
}): Promise<{
  ai: AiGenerationMetadata
  content: string
  retrievalExecution: BrdProviderResult['retrievalExecution']
  governance: BrdGovernancePayload | null
}> {
  const routingDecision = resolveAiRoutingDecision({
    task: 'brd',
    useDummyData: input.useDummyData,
    requirePrivateProcessing: input.requirePrivateProcessing,
  })
  const provider = getProvider(routingDecision.provider)
  const options: BrdGenerationOptions | undefined = input.retrievalPolicy
    ? { retrievalPolicy: input.retrievalPolicy }
    : undefined
  const brdResult = await provider.generateBRD(input.content, options)
  const governance = brdResult.governance ?? null
  const baseAi = buildAiMetadata(
    provider,
    'brd',
    routingDecision.reason,
    routingDecision.requiresPrivateProcessing
  )

  return {
    ai: {
      ...baseAi,
      promptPackageVersion:
        governance?.promptPackageVersion ?? BRD_PROMPT_PACKAGE_VERSION,
    },
    content: brdResult.content,
    retrievalExecution:
      brdResult.retrievalExecution ?? emptyRetrievalExecutionMeta(),
    governance,
  }
}

export async function generateBRDFromFileWithPolicy(input: {
  fileContent: string
  useDummyData?: boolean
  requirePrivateProcessing?: boolean
  retrievalPolicy?: BrdGenerationOptions['retrievalPolicy']
}): Promise<{
  ai: AiGenerationMetadata
  content: string
  retrievalExecution: BrdProviderResult['retrievalExecution']
  governance: BrdGovernancePayload | null
}> {
  const routingDecision = resolveAiRoutingDecision({
    task: 'brd-from-file',
    useDummyData: input.useDummyData,
    requirePrivateProcessing: input.requirePrivateProcessing,
  })
  const provider = getProvider(routingDecision.provider)
  const options: BrdGenerationOptions | undefined = input.retrievalPolicy
    ? { retrievalPolicy: input.retrievalPolicy }
    : undefined
  const brdResult = await provider.generateBRDFromFile(input.fileContent, options)
  const governance = brdResult.governance ?? null
  const baseAi = buildAiMetadata(
    provider,
    'brd-from-file',
    routingDecision.reason,
    routingDecision.requiresPrivateProcessing
  )

  return {
    ai: {
      ...baseAi,
      promptPackageVersion:
        governance?.promptPackageVersion ?? BRD_PROMPT_PACKAGE_VERSION,
    },
    content: brdResult.content,
    retrievalExecution:
      brdResult.retrievalExecution ?? emptyRetrievalExecutionMeta(),
    governance,
  }
}

export async function generateSprintPlanWithPolicy(input: {
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
  useDummyData?: boolean
  requirePrivateProcessing?: boolean
  retrievalPolicy?: BrdGenerationOptions['retrievalPolicy']
}): Promise<{ ai: AiGenerationMetadata; sprintPlan: SprintPlan }> {
  const routingDecision = resolveAiRoutingDecision({
    task: 'sprint-plan',
    useDummyData: input.useDummyData,
    requirePrivateProcessing: input.requirePrivateProcessing,
  })
  const provider = getProvider(routingDecision.provider)

  return {
    ai: buildAiMetadata(
      provider,
      'sprint-plan',
      routingDecision.reason,
      routingDecision.requiresPrivateProcessing
    ),
    sprintPlan: await provider.generateSprintPlan({
      brdText: input.brdText,
      technicalContext: input.technicalContext,
      teamMembers: input.teamMembers,
      capacityPerMember: input.capacityPerMember,
      sprintDuration: input.sprintDuration,
      velocity: input.velocity,
      resources: input.resources,
      retrievalPolicy: input.retrievalPolicy,
    }),
  }
}
