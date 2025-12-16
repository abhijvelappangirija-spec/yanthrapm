/**
 * Prompt generator for Sprint Plan creation with BRD and Technical Context
 */

export interface SprintPlanPromptParams {
  brd: string
  technicalContext: string
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  velocity?: number
}

/**
 * Generate sprint plan prompt with BRD and Technical Context
 */
export function generateSprintPlanPrompt(
  brd: string,
  technicalContext: string,
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number
): string {
  // Extract text content from HTML BRD
  const textContent = brd.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const totalCapacity = teamMembers * capacityPerMember * sprintDuration
  const calculatedVelocity = velocity || Math.floor(totalCapacity / 8)

  return `You are an expert AI solution architect and Agile practitioner.

### Inputs
**BRD:**  
${textContent.substring(0, 8000)}

**Technical Context (Existing System Overview):**  
${technicalContext || 'No specific technical context provided. Use standard best practices.'}

**Team Configuration:**
- Team Members: ${teamMembers}
- Capacity per Member: ${capacityPerMember} hours
- Sprint Duration: ${sprintDuration} weeks
- Velocity: ${calculatedVelocity} story points per sprint

### Instructions
- Understand the BRD as the business need.
- Use the technical context as constraints that MUST be respected.
- Use the BRD as the business requirement foundation. Use the Technical Context section as the architectural constraint guide. Do not propose designs or tech choices that contradict the provided Technical Context.
- Identify technical dependencies and sequencing based on the existing stack.
- Break down work into: Epics → User Stories → Acceptance Criteria.
- Assign high-level story points using Fibonacci sequence (1, 2, 3, 5, 8, 13, 21).
- Produce a sprint plan based on the provided velocity: ${calculatedVelocity} story points per sprint.
- Distribute stories across sprints respecting velocity limits.
- Highlight areas where existing systems require refactoring vs. new development.

### Output Format
{
  "storyGroups": [
    {
      "epic": "Epic Name",
      "stories": ["Story 1", "Story 2", ...],
      "storyPoints": number
    }
  ],
  "storiesCount": number,
  "suggestedStoryPoints": number,
  "sprintBreakdown": [
    {
      "sprint": number,
      "stories": ["Story 1", "Story 2", ...],
      "totalStoryPoints": number,
      "capacity": number
    }
  ]
}

Return ONLY valid JSON, no additional text.`
}

