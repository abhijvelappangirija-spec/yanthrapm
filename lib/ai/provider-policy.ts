import { AiProviderName, AiRoutingReason, AiTask } from '@/lib/ai/types'

export class AiPolicyError extends Error {
  status: number

  constructor(message: string, status: number = 503) {
    super(message)
    this.name = 'AiPolicyError'
    this.status = status
  }
}

type ProviderPolicyInput = {
  task: AiTask
  useDummyData?: boolean
  requirePrivateProcessing?: boolean
}

export type AiRoutingDecision = {
  provider: AiProviderName
  reason: AiRoutingReason
  requiresPrivateProcessing: boolean
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

function parseTaskList(value: string | undefined): Set<AiTask> {
  const tasks = new Set<AiTask>()

  for (const rawTask of (value || '').split(',')) {
    const task = rawTask.trim().toLowerCase()

    if (!task) {
      continue
    }

    if (task === 'brd' || task === 'brd-from-file' || task === 'sprint-plan') {
      tasks.add(task)
      continue
    }

    throw new AiPolicyError(`Unsupported task configured in AI_PRIVATE_TASKS: ${rawTask}`, 500)
  }

  return tasks
}

function taskRequiresPrivateProcessing(
  task: AiTask,
  requirePrivateProcessing: boolean
): boolean {
  if (requirePrivateProcessing) {
    return true
  }

  return parseTaskList(process.env.AI_PRIVATE_TASKS).has(task)
}

function getConfiguredPrivateProvider(): AiProviderName {
  const configuredProvider = (process.env.AI_PRIVATE_PROVIDER || 'ollama')
    .trim()
    .toLowerCase()

  if (configuredProvider === 'ollama' || configuredProvider === 'dummy') {
    return configuredProvider
  }

  if (configuredProvider === 'perplexity') {
    throw new AiPolicyError('AI_PRIVATE_PROVIDER cannot be an external provider.', 500)
  }

  throw new AiPolicyError('Unsupported AI_PRIVATE_PROVIDER configured.', 500)
}

function getConfiguredProvider(task: AiTask): AiRoutingDecision {
  const taskSpecificProvider =
    (task === 'brd' || task === 'brd-from-file'
      ? process.env.AI_BRD_PROVIDER
      : process.env.AI_SPRINT_PROVIDER) || process.env.AI_DEFAULT_PROVIDER

  const normalizedProvider = (taskSpecificProvider || 'perplexity').trim().toLowerCase()
  const hasTaskSpecificOverride =
    task === 'brd' || task === 'brd-from-file'
      ? Boolean(process.env.AI_BRD_PROVIDER?.trim())
      : Boolean(process.env.AI_SPRINT_PROVIDER?.trim())

  if (
    normalizedProvider === 'dummy' ||
    normalizedProvider === 'ollama' ||
    normalizedProvider === 'perplexity'
  ) {
    return {
      provider: normalizedProvider,
      reason: hasTaskSpecificOverride ? 'task-specific-provider' : 'default-provider',
      requiresPrivateProcessing: false,
    }
  }

  throw new AiPolicyError(
    `Unsupported AI provider configured for ${task}.`,
    500
  )
}

export function resolveAiRoutingDecision({
  task,
  useDummyData = false,
  requirePrivateProcessing = false,
}: ProviderPolicyInput): AiRoutingDecision {
  if (useDummyData) {
    return {
      provider: 'dummy',
      reason: 'dummy-data-requested',
      requiresPrivateProcessing: requirePrivateProcessing,
    }
  }

  const requiresPrivateProcessing = taskRequiresPrivateProcessing(
    task,
    requirePrivateProcessing
  )
  const decision = getConfiguredProvider(task)

  if (requiresPrivateProcessing && decision.provider === 'perplexity') {
    return {
      provider: getConfiguredPrivateProvider(),
      reason: 'private-policy-enforced',
      requiresPrivateProcessing: true,
    }
  }

  if (
    decision.provider === 'perplexity' &&
    isTruthyEnvFlag(process.env.AI_EXTERNAL_DISABLED)
  ) {
    throw new AiPolicyError(
      'External AI providers are disabled by policy for this environment.',
      503
    )
  }

  return {
    ...decision,
    requiresPrivateProcessing,
  }
}

export function resolveAiProviderName(input: ProviderPolicyInput): AiProviderName {
  return resolveAiRoutingDecision(input).provider
}
