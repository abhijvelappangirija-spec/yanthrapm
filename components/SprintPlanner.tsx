'use client'

import { useState, useEffect } from 'react'

import AiAuditSummary from '@/components/AiAuditSummary'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import type { AiGenerationMetadata } from '@/lib/ai/types'
import LoadingSpinner from './LoadingSpinner'

/**
 * Generate a detailed story description with acceptance criteria
 */
function generateStoryDescription(
  storyTitle: string,
  epicName: string,
  storyPoints: number,
  sprintPlan: SprintPlanResponse
): string {
  // Find which sprint this story belongs to
  const sprintInfo = sprintPlan.sprintBreakdown.find(sprint =>
    sprint.stories.includes(storyTitle)
  )
  
  // Find the epic group to get more context
  const epicGroup = sprintPlan.storyGroups.find(group => group.epic === epicName)
  const totalEpicStories = epicGroup?.stories.length || 0
  const totalEpicPoints = epicGroup?.storyPoints || 0
  
  const description = `h2. Story Overview

${storyTitle}

This user story is part of the *${epicName}* epic and contributes to delivering the overall functionality and business value outlined in the Business Requirements Document.

h2. Story Details

* *Epic Name:* ${epicName}
* *Story Points:* ${storyPoints}
* *Epic Total Stories:* ${totalEpicStories}
* *Epic Total Points:* ${totalEpicPoints}
${sprintInfo ? `* *Assigned Sprint:* Sprint ${sprintInfo.sprint}` : ''}
${sprintInfo ? `* *Sprint Capacity:* ${sprintInfo.capacity} story points` : ''}
${sprintInfo ? `* *Sprint Total Points:* ${sprintInfo.totalStoryPoints} story points` : ''}

h2. Description

As a user/developer/stakeholder, I need to ${storyTitle.toLowerCase()} so that I can achieve the goals outlined in the ${epicName} epic.

This story addresses specific requirements from the Business Requirements Document and should be implemented following the project's technical standards and best practices.

h2. Acceptance Criteria

The following criteria must be met for this story to be considered complete:

* The functionality described in the story title is fully implemented and working as expected
* All related functional requirements from the Business Requirements Document are addressed
* All related non-functional requirements (performance, security, scalability) are considered and met
* Code follows project coding standards, conventions, and best practices
* Unit tests are written with adequate coverage and all tests are passing
* Integration tests are written and passing (if applicable)
* API documentation is updated (if applicable)
* User documentation is updated (if applicable)
* Code review is completed and all feedback is addressed
* The feature is tested in the appropriate environment (dev/staging)
* No critical or high-severity bugs are introduced
* The implementation aligns with the overall epic goals and architecture

h2. Technical Requirements

* Review the Business Requirements Document for detailed functional and non-functional requirements
* Ensure alignment with the overall epic goals and architecture
* Consider dependencies with other stories in the same epic or sprint
* Follow the project's technical architecture and design patterns
* Ensure proper error handling and logging
* Consider security implications and follow security best practices
* Ensure the implementation is scalable and maintainable

h2. Dependencies

* Review related stories in the same epic: ${epicName}
${sprintInfo && sprintInfo.stories.length > 1 ? `* Coordinate with other stories in Sprint ${sprintInfo.sprint}` : ''}
* Ensure no blocking dependencies before starting work

h2. Definition of Done

* [ ] Code implemented according to requirements
* [ ] Code reviewed and approved by at least one team member
* [ ] Unit tests written with adequate coverage (minimum 80%)
* [ ] All unit tests passing
* [ ] Integration tests written and passing (if applicable)
* [ ] Code follows project standards and best practices
* [ ] Documentation updated (code comments, API docs, user docs)
* [ ] Feature tested in development environment
* [ ] Feature tested in staging environment (if applicable)
* [ ] No critical or high-severity bugs
* [ ] Performance requirements met (if applicable)
* [ ] Security requirements met (if applicable)
* [ ] Ready for deployment to production

h2. Notes

* Refer to the Business Requirements Document for comprehensive details on functional and non-functional requirements
* If clarification is needed, consult with the product owner or business analyst
* Update this ticket with any blockers, questions, or additional context as work progresses`

  return description
}

interface ProjectDefaults {
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  techStack?: string
  roles?: string[]
  resources?: Array<{
    id: string
    name: string
    tech_stack: string
    capacity: number
  }>
}

interface SprintPlannerProps {
  brdText: string
  brdId?: string | null
  technicalContext?: string
  useDummyData?: boolean
  requirePrivateProcessing?: boolean
  projectDefaults?: ProjectDefaults
}

interface StoryGroup {
  epic: string
  stories: string[]
  storyPoints: number
}

interface SprintBreakdown {
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
}

interface SprintPlanResponse {
  storyGroups: StoryGroup[]
  storiesCount: number
  suggestedStoryPoints: number
  sprintBreakdown: SprintBreakdown[]
}

export default function SprintPlanner({
  brdText,
  brdId,
  technicalContext = '',
  useDummyData = false,
  requirePrivateProcessing = false,
  projectDefaults,
}: SprintPlannerProps) {
  const [teamMembers, setTeamMembers] = useState<number>(
    projectDefaults?.teamMembers || 5
  )
  const [capacityPerMember, setCapacityPerMember] = useState<number>(
    projectDefaults?.capacityPerMember || 8
  )
  const [sprintDuration, setSprintDuration] = useState<number>(
    projectDefaults?.sprintDuration || 2
  )
  const [velocity, setVelocity] = useState<number | null>(null)

  // Update form when project defaults change
  useEffect(() => {
    if (projectDefaults) {
      setTeamMembers(projectDefaults.teamMembers)
      setCapacityPerMember(projectDefaults.capacityPerMember)
      setSprintDuration(projectDefaults.sprintDuration)
    }
  }, [projectDefaults])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sprintPlan, setSprintPlan] = useState<SprintPlanResponse | null>(null)
  const [sprintAiMetadata, setSprintAiMetadata] = useState<AiGenerationMetadata | null>(null)
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [isCreatingJira, setIsCreatingJira] = useState(false)
  const [jiraResult, setJiraResult] = useState<any>(null)
  
  // Jira configuration state (only email and project key needed from user)
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraProjectKey, setJiraProjectKey] = useState('')

  const handleGenerateSprintPlan = async () => {
    if (!brdText.trim()) {
      setError('BRD text is required')
      return
    }

    setIsLoading(true)
    setError(null)
    setSprintAiMetadata(null)

    try {
      const response = await fetchWithAuth('/api/generate-sprint-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brdText,
          technicalContext,
          teamMembers,
          capacityPerMember,
          sprintDuration,
          velocity: velocity || undefined,
          brdId: brdId || undefined,
          useDummyData,
          requirePrivateProcessing,
          resources: projectDefaults?.resources?.map((r) => {
            // Map tech_stack and name to role based on keywords
            const techStack = (r.tech_stack || '').toLowerCase()
            const name = (r.name || '').toLowerCase()
            let role = 'Developer' // default
            
            // Check tech_stack first, then name
            const combinedText = `${techStack} ${name}`
            
            if (combinedText.includes('qa') || combinedText.includes('test') || combinedText.includes('quality') || 
                combinedText.includes('tester') || combinedText.includes('testing')) {
              role = 'QA'
            } else if (combinedText.includes('pm') || combinedText.includes('project manager') || 
                       combinedText.includes('manager') || combinedText.includes('project management')) {
              role = 'PM'
            } else if (combinedText.includes('architect') || combinedText.includes('architecture') ||
                       combinedText.includes('solution architect') || combinedText.includes('tech lead')) {
              role = 'Architect'
            }
            
            return {
              name: r.name,
              role: role,
              tech_stack: r.tech_stack,
              capacity: r.capacity,
            }
          }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate sprint plan')
      }

      setSprintPlan(data)
      setSprintAiMetadata(data.ai || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-700">Sprint Planner</h2>
        {projectDefaults && (
          <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              📋 Project defaults applied (editable)
            </p>
          </div>
        )}
      </div>

      {!sprintPlan ? (
        <>
          {projectDefaults && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Project Defaults Applied:</strong>
              </p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Team Members:</span>{' '}
                  <span className="font-medium">{projectDefaults.teamMembers}</span>
                </div>
                <div>
                  <span className="text-blue-600">Capacity/Member:</span>{' '}
                  <span className="font-medium">{projectDefaults.capacityPerMember} hrs</span>
                </div>
                <div>
                  <span className="text-blue-600">Sprint Duration:</span>{' '}
                  <span className="font-medium">{projectDefaults.sprintDuration} weeks</span>
                </div>
                {projectDefaults.techStack && (
                  <div className="col-span-3">
                    <span className="text-blue-600">Tech Stack:</span>{' '}
                    <span className="font-medium">{projectDefaults.techStack}</span>
                  </div>
                )}
                {projectDefaults.roles && projectDefaults.roles.length > 0 && (
                  <div className="col-span-3">
                    <span className="text-blue-600">Roles:</span>{' '}
                    <span className="font-medium">{projectDefaults.roles.join(', ')}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                You can edit these values below if needed for this sprint.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Members
              </label>
              <input
                type="number"
                min="1"
                value={teamMembers}
                onChange={(e) => setTeamMembers(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity Per Member (hours)
              </label>
              <input
                type="number"
                min="1"
                value={capacityPerMember}
                onChange={(e) => setCapacityPerMember(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprint Duration (weeks)
              </label>
              <input
                type="number"
                min="1"
                value={sprintDuration}
                onChange={(e) => setSprintDuration(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Velocity (optional - story points per sprint)
              </label>
              <input
                type="number"
                min="0"
                value={velocity || ''}
                onChange={(e) => setVelocity(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Leave empty to auto-calculate"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerateSprintPlan}
            disabled={isLoading || !brdText.trim()}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Generating Sprint Plan...' : 'Generate Sprint Plan'}
          </button>

          {isLoading && <LoadingSpinner />}
        </>
      ) : (
        <div className="space-y-6">
          <AiAuditSummary ai={sprintAiMetadata} />
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Stories</p>
              <p className="text-2xl font-bold text-blue-600">{sprintPlan.storiesCount}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Suggested Story Points</p>
              <p className="text-2xl font-bold text-green-600">{sprintPlan.suggestedStoryPoints}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Epics</p>
              <p className="text-2xl font-bold text-purple-600">{sprintPlan.storyGroups.length}</p>
            </div>
          </div>

          {/* Story Groups (Epics) */}
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Story Groups (Epics)</h3>
            <div className="space-y-4">
              {sprintPlan.storyGroups.map((group, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{group.epic}</h4>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {group.storyPoints} points
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-4">
                    {group.stories.map((story, storyIndex) => (
                      <li key={storyIndex}>{story}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Sprint Breakdown Table */}
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Sprint Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Sprint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Dev Stories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Story Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Dev Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      QA Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      PM Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Architect Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sprintPlan.sprintBreakdown.map((sprint, index) => {
                    const utilization = (sprint.totalStoryPoints / sprint.capacity) * 100
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Sprint {sprint.sprint}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <ul className="list-disc list-inside">
                            {sprint.stories.map((story, storyIndex) => (
                              <li key={storyIndex}>{story}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sprint.totalStoryPoints}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {sprint.capacity} pts
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sprint.qaTasks && sprint.qaTasks.length > 0 ? (
                            <div>
                              <ul className="list-disc list-inside mb-1">
                                {sprint.qaTasks.map((task, taskIndex) => (
                                  <li key={taskIndex}>{task}</li>
                                ))}
                              </ul>
                              {sprint.qaHours && (
                                <span className="text-xs text-gray-500">
                                  ({sprint.qaHours}h)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sprint.pmTasks && sprint.pmTasks.length > 0 ? (
                            <div>
                              <ul className="list-disc list-inside mb-1">
                                {sprint.pmTasks.map((task, taskIndex) => (
                                  <li key={taskIndex}>{task}</li>
                                ))}
                              </ul>
                              {sprint.pmHours && (
                                <span className="text-xs text-gray-500">
                                  ({sprint.pmHours}h)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {sprint.architectTasks && sprint.architectTasks.length > 0 ? (
                            <div>
                              <ul className="list-disc list-inside mb-1">
                                {sprint.architectTasks.map((task, taskIndex) => (
                                  <li key={taskIndex}>{task}</li>
                                ))}
                              </ul>
                              {sprint.architectHours && (
                                <span className="text-xs text-gray-500">
                                  ({sprint.architectHours}h)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              utilization > 100
                                ? 'bg-red-100 text-red-800'
                                : utilization > 80
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {utilization.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowJiraModal(true)}
              className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Create Jira Stories
            </button>
            <button
              onClick={() => {
                setSprintPlan(null)
                setError(null)
                setJiraResult(null)
              }}
              className="flex-1 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Generate New Sprint Plan
            </button>
          </div>

          {/* Jira Results */}
          {jiraResult && (
            <div className="mt-4 space-y-4">
              {jiraResult.created > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">
                    Successfully Created {jiraResult.created} Story/Stories
                  </h4>
                  <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                    {jiraResult.results.success.map((item: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={item.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {item.issueKey}
                        </a>
                        {' - '}
                        {item.storyTitle} (Epic: {item.epicName})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {jiraResult.failed > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">
                    Failed to Create {jiraResult.failed} Story/Stories
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {jiraResult.results.errors.map((item: any, idx: number) => (
                      <li key={idx}>
                        {item.storyTitle}: {item.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Jira Configuration Modal */}
      {showJiraModal && sprintPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">
              Jira Configuration
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Jira Base URL and API Token are configured in environment variables.
                  You only need to provide your email and project key.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Jira account email address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Key
                </label>
                <input
                  type="text"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                  placeholder="PROJ"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The project key where stories will be created (e.g., PROJ, DEV, TEST)
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={async () => {
                  if (!jiraEmail || !jiraProjectKey) {
                    setError('Please provide your email and project key')
                    return
                  }

                  setIsCreatingJira(true)
                  setError(null)

                  try {
                    // Transform sprint plan stories into Jira format
                    const jiraStories: Array<{
                      title: string
                      description: string
                      points: number
                      epic: string
                    }> = []

                    sprintPlan.storyGroups.forEach((group) => {
                      group.stories.forEach((story) => {
                        // Distribute story points evenly among stories in the epic
                        const pointsPerStory = Math.ceil(group.storyPoints / group.stories.length)
                        
                        // Generate detailed description with acceptance criteria
                        const description = generateStoryDescription(story, group.epic, pointsPerStory, sprintPlan)
                        
                        jiraStories.push({
                          title: story,
                          description: description,
                          points: pointsPerStory,
                          epic: group.epic,
                        })
                      })
                    })

                    const response = await fetchWithAuth('/api/create-jira-tickets', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        stories: jiraStories,
                        jiraEmail,
                        jiraProjectKey,
                      }),
                    })

                    const data = await response.json()

                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to create Jira tickets')
                    }

                    setJiraResult(data)
                    setShowJiraModal(false)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'An error occurred')
                  } finally {
                    setIsCreatingJira(false)
                  }
                }}
                disabled={isCreatingJira}
                className="flex-1 bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingJira ? 'Creating...' : 'Create Stories'}
              </button>
              <button
                onClick={() => {
                  setShowJiraModal(false)
                  setError(null)
                }}
                disabled={isCreatingJira}
                className="flex-1 bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
