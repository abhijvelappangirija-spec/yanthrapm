import { AiPolicyError, resolveAiRoutingDecision } from '@/lib/ai/provider-policy'
import { dummyAiProvider } from '@/lib/ai/providers/dummy-provider'
import { ollamaAiProvider } from '@/lib/ai/providers/ollama-provider'
import { perplexityAiProvider } from '@/lib/ai/providers/perplexity-provider'
import {
  AiGenerationMetadata,
  AiProvider,
  AiProviderName,
  AiTask,
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
}): Promise<{ ai: AiGenerationMetadata; content: string }> {
  const routingDecision = resolveAiRoutingDecision({
    task: 'brd',
    useDummyData: input.useDummyData,
    requirePrivateProcessing: input.requirePrivateProcessing,
  })
  const provider = getProvider(routingDecision.provider)

  return {
    ai: buildAiMetadata(
      provider,
      'brd',
      routingDecision.reason,
      routingDecision.requiresPrivateProcessing
    ),
    content: await provider.generateBRD(input.content),
  }
}

export async function generateBRDFromFileWithPolicy(input: {
  fileContent: string
  useDummyData?: boolean
  requirePrivateProcessing?: boolean
}): Promise<{ ai: AiGenerationMetadata; content: string }> {
  const routingDecision = resolveAiRoutingDecision({
    task: 'brd-from-file',
    useDummyData: input.useDummyData,
    requirePrivateProcessing: input.requirePrivateProcessing,
  })
  const provider = getProvider(routingDecision.provider)

  return {
    ai: buildAiMetadata(
      provider,
      'brd-from-file',
      routingDecision.reason,
      routingDecision.requiresPrivateProcessing
    ),
    content: await provider.generateBRDFromFile(input.fileContent),
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
    sprintPlan: await provider.generateSprintPlan(input),
  }
}
