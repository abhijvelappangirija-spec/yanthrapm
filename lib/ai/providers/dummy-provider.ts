import { buildBrdGovernancePayload } from '@/lib/ai/brd-governance'
import { emptyRetrievalExecutionMeta } from '@/lib/ai/brd-retrieval'
import { AiProvider } from '@/lib/ai/types'
import {
  buildDummyBrdEvidence,
  renderBrdHtmlFromEvidence,
} from '@/lib/ai/brd-evidence'
import { finalizeBrdHtml } from '@/lib/ai/brd-validator'
import { generateDummySprintPlan } from '@/lib/perplexity'

export const dummyAiProvider: AiProvider = {
  name: 'dummy',
  isExternal: false,

  getModel() {
    return 'dummy-static'
  },

  async generateBRD(content) {
    const evidence = buildDummyBrdEvidence(content, 'input')
    const composedHtml = renderBrdHtmlFromEvidence(evidence)
    const finalized = finalizeBrdHtml(composedHtml, evidence)
    return {
      content: finalized.html,
      retrievalExecution: emptyRetrievalExecutionMeta(),
      governance: buildBrdGovernancePayload(evidence, finalized.validation),
    }
  },

  async generateBRDFromFile(fileContent) {
    const evidence = buildDummyBrdEvidence(fileContent, 'existing-brd')
    const composedHtml = renderBrdHtmlFromEvidence(evidence)
    const finalized = finalizeBrdHtml(composedHtml, evidence)
    return {
      content: finalized.html,
      retrievalExecution: emptyRetrievalExecutionMeta(),
      governance: buildBrdGovernancePayload(evidence, finalized.validation),
    }
  },

  async generateSprintPlan(input) {
    return generateDummySprintPlan(
      input.teamMembers,
      input.capacityPerMember,
      input.sprintDuration,
      input.velocity
    )
  },
}
