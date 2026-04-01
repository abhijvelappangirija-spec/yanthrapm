import { AiProvider } from '@/lib/ai/types'
import {
  generateBRDFromFile,
  generateBRDWithPerplexity,
  generateSprintPlanWithPerplexity,
} from '@/lib/perplexity'

export const perplexityAiProvider: AiProvider = {
  name: 'perplexity',
  isExternal: true,

  getModel() {
    return 'sonar-pro'
  },

  async generateBRD(content, options) {
    return generateBRDWithPerplexity(content, options?.retrievalPolicy)
  },

  async generateBRDFromFile(fileContent, options) {
    return generateBRDFromFile(fileContent, options?.retrievalPolicy)
  },

  async generateSprintPlan(input) {
    return generateSprintPlanWithPerplexity(
      input.brdText,
      input.technicalContext || '',
      input.teamMembers,
      input.capacityPerMember,
      input.sprintDuration,
      input.velocity,
      input.resources,
      input.retrievalPolicy
    )
  },
}
