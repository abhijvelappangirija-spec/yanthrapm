import { AiProvider } from '@/lib/ai/types'
import {
  buildDummyBrdEvidence,
  renderBrdHtmlFromEvidence,
} from '@/lib/ai/brd-evidence'
import { generateDummySprintPlan } from '@/lib/perplexity'

export const dummyAiProvider: AiProvider = {
  name: 'dummy',
  isExternal: false,

  getModel() {
    return 'dummy-static'
  },

  async generateBRD(content) {
    return renderBrdHtmlFromEvidence(buildDummyBrdEvidence(content, 'input'))
  },

  async generateBRDFromFile(fileContent) {
    return renderBrdHtmlFromEvidence(
      buildDummyBrdEvidence(fileContent, 'existing-brd')
    )
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
