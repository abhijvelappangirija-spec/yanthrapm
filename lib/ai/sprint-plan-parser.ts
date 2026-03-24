import { SprintPlan } from '@/lib/ai/types'

export function parseSprintPlanResponse(response: string): SprintPlan {
  let jsonString = response.trim()

  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonString = jsonMatch[1]
  }

  const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    jsonString = jsonObjectMatch[0]
  }

  const sprintPlan = JSON.parse(jsonString) as SprintPlan

  if (!sprintPlan.storyGroups || !Array.isArray(sprintPlan.storyGroups)) {
    throw new Error('Invalid response: storyGroups is missing or not an array')
  }

  if (!sprintPlan.sprintBreakdown || !Array.isArray(sprintPlan.sprintBreakdown)) {
    throw new Error('Invalid response: sprintBreakdown is missing or not an array')
  }

  if (!sprintPlan.storiesCount) {
    sprintPlan.storiesCount = sprintPlan.storyGroups.reduce(
      (sum, group) => sum + (group.stories?.length || 0),
      0
    )
  }

  if (!sprintPlan.suggestedStoryPoints) {
    sprintPlan.suggestedStoryPoints = sprintPlan.storyGroups.reduce(
      (sum, group) => sum + (group.storyPoints || 0),
      0
    )
  }

  return sprintPlan
}
