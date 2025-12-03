'use client'

import { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface SprintPlannerProps {
  brdText: string
  brdId?: string | null
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
}

interface SprintPlanResponse {
  storyGroups: StoryGroup[]
  storiesCount: number
  suggestedStoryPoints: number
  sprintBreakdown: SprintBreakdown[]
}

export default function SprintPlanner({ brdText, brdId }: SprintPlannerProps) {
  const [teamMembers, setTeamMembers] = useState<number>(5)
  const [capacityPerMember, setCapacityPerMember] = useState<number>(8)
  const [sprintDuration, setSprintDuration] = useState<number>(2)
  const [velocity, setVelocity] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sprintPlan, setSprintPlan] = useState<SprintPlanResponse | null>(null)
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

    try {
      const response = await fetch('/api/generate-sprint-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brdText,
          teamMembers,
          capacityPerMember,
          sprintDuration,
          velocity: velocity || undefined,
          brdId: brdId || undefined,
          userId: 'user-123', // Replace with actual user ID from auth
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate sprint plan')
      }

      setSprintPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-700">Sprint Planner</h2>

      {!sprintPlan ? (
        <>
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
                      Stories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Story Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Capacity
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
                          {sprint.capacity}
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
                        jiraStories.push({
                          title: story,
                          description: `Story from epic: ${group.epic}\n\nPart of sprint plan with ${pointsPerStory} story points.`,
                          points: pointsPerStory,
                          epic: group.epic,
                        })
                      })
                    })

                    const response = await fetch('/api/create-jira-tickets', {
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

