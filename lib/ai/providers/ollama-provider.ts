import {
  buildBRDCompositionPrompt,
  buildBRDEvidenceExtractionPrompt,
  buildSprintPlanPromptInput,
} from '@/lib/ai/task-prompts'
import { buildBrdGovernancePayload } from '@/lib/ai/brd-governance'
import { emptyRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'
import {
  parseBrdEvidenceResponse,
} from '@/lib/ai/brd-evidence'
import { finalizeBrdHtml } from '@/lib/ai/brd-validator'
import { parseSprintPlanResponse } from '@/lib/ai/sprint-plan-parser'
import { AiProvider, AiTask } from '@/lib/ai/types'

type OllamaChatResponse = {
  message?: {
    content?: string
  }
}

function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
}

function resolveOllamaModelTask(task: AiTask): 'brd' | 'sprint-plan' {
  return task === 'sprint-plan' ? 'sprint-plan' : 'brd'
}

function getOllamaModel(task: AiTask): string {
  const modelTask = resolveOllamaModelTask(task)
  const configuredModel =
    (modelTask === 'brd'
      ? process.env.OLLAMA_BRD_MODEL
      : process.env.OLLAMA_SPRINT_MODEL) || process.env.OLLAMA_MODEL

  if (!configuredModel?.trim()) {
    throw new Error(`Ollama model is not configured for ${modelTask}.`)
  }

  return configuredModel.trim()
}

async function callOllamaChat(input: {
  model: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  temperature?: number
}): Promise<string> {
  const base = getOllamaBaseUrl()
  const url = `${base}/api/chat`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: input.model,
        stream: false,
        messages: input.messages,
        options: {
          temperature: input.temperature ?? 0.2,
        },
      }),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Cannot reach Ollama at ${url} (${detail}). Start the daemon (e.g. run the Ollama app or \`ollama serve\`), ensure the model is pulled (\`ollama pull ${input.model}\`), and check OLLAMA_BASE_URL in .env.local.`
    )
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
  }

  const data = (await response.json()) as OllamaChatResponse
  const content = data.message?.content?.trim()

  if (!content) {
    throw new Error('No response from Ollama')
  }

  return content
}

export const ollamaAiProvider: AiProvider = {
  name: 'ollama',
  isExternal: false,

  getModel(task) {
    return getOllamaModel(task)
  },

  async generateBRD(content) {
    const extractionPrompt = await buildBRDEvidenceExtractionPrompt({
      content,
      sourceType: 'input',
    })
    const evidenceResponse = await callOllamaChat({
      model: getOllamaModel('brd'),
      messages: [
        { role: 'system', content: extractionPrompt.systemPrompt },
        { role: 'user', content: extractionPrompt.userPrompt },
      ],
      temperature: 0.1,
    })
    const evidence = parseBrdEvidenceResponse(evidenceResponse)
    const compositionPrompt = await buildBRDCompositionPrompt(evidence)

    const composedHtml = await callOllamaChat({
      model: getOllamaModel('brd'),
      messages: [
        { role: 'system', content: compositionPrompt.systemPrompt },
        { role: 'user', content: compositionPrompt.userPrompt },
      ],
      temperature: 0.2,
    })

    const finalized = finalizeBrdHtml(composedHtml, evidence)
    return {
      content: finalized.html,
      retrievalExecution: emptyRetrievalExecutionMeta(),
      governance: buildBrdGovernancePayload(evidence, finalized.validation),
    }
  },

  async generateBRDFromFile(fileContent) {
    const extractionPrompt = await buildBRDEvidenceExtractionPrompt({
      content: fileContent,
      sourceType: 'existing-brd',
    })
    const evidenceResponse = await callOllamaChat({
      model: getOllamaModel('brd'),
      messages: [
        { role: 'system', content: extractionPrompt.systemPrompt },
        { role: 'user', content: extractionPrompt.userPrompt },
      ],
      temperature: 0.1,
    })
    const evidence = parseBrdEvidenceResponse(evidenceResponse)
    const compositionPrompt = await buildBRDCompositionPrompt(evidence)

    const composedHtml = await callOllamaChat({
      model: getOllamaModel('brd'),
      messages: [
        { role: 'system', content: compositionPrompt.systemPrompt },
        { role: 'user', content: compositionPrompt.userPrompt },
      ],
      temperature: 0.2,
    })

    const finalized = finalizeBrdHtml(composedHtml, evidence)
    return {
      content: finalized.html,
      retrievalExecution: emptyRetrievalExecutionMeta(),
      governance: buildBrdGovernancePayload(evidence, finalized.validation),
    }
  },

  async generateSprintPlan(input) {
    const { systemPrompt, userPrompt } = await buildSprintPlanPromptInput(input)
    const response = await callOllamaChat({
      model: getOllamaModel('sprint-plan'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    })

    return parseSprintPlanResponse(response)
  },
}
