"use client"

import { Fragment, useEffect, useState } from 'react'

import AiAuditSummary from '@/components/AiAuditSummary'
import RequireAppAccess from '@/components/auth/RequireAppAccess'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type BRDRecord = {
  id: string
  raw_input?: string
  projectName?: string
  created_at: string
  ai_provider?: string | null
  ai_model?: string | null
  ai_task?: string | null
  ai_is_external?: boolean | null
  ai_generated_at?: string | null
}

export default function HistoryPage() {
  const [brds, setBrds] = useState<BRDRecord[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [activeBrdId, setActiveBrdId] = useState<string | null>(null)
  const [sprints, setSprints] = useState<Record<string, any[]>>({})
  const activeSprints = activeBrdId ? sprints[activeBrdId] : []

  useEffect(() => {
    async function fetchBrds() {
      try {
        const response = await fetchWithAuth('/api/brds')
        if (!response.ok) {
          return
        }

        const data = await response.json()
        setBrds(data.brds || [])
      } catch (error) {
        console.error('Failed to fetch BRD history:', error)
      }
    }

    fetchBrds()
  }, [])

  async function handleOpenModal(brdId: string) {
    setActiveBrdId(brdId)
    setModalOpen(true)

    if (!sprints[brdId]) {
      try {
        const response = await fetchWithAuth(`/api/sprints?brdId=${encodeURIComponent(brdId)}`)
        if (!response.ok) {
          return
        }

        const data = await response.json()
        setSprints((prev) => ({ ...prev, [brdId]: data.sprints || [] }))
      } catch (error) {
        console.error('Failed to fetch sprint history:', error)
      }
    }
  }

  function handleCloseModal() {
    setModalOpen(false)
    setActiveBrdId(null)
  }

  return (
    <RequireAppAccess>
      <div className="max-w-5xl mx-auto py-10">
        <h2 className="text-2xl font-bold mb-6">BRD History</h2>
        <table className="min-w-full bg-white border rounded shadow">
        <thead>
          <tr>
            <th className="text-start px-4 py-2 border-b">Project Name</th>
            <th className="text-start px-4 py-2 border-b">Created At</th>
            <th className="text-start px-4 py-2 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {brds.map((brd) => (
            <Fragment key={brd.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b max-w-xs">
                  <span className="block brd-name-clamp">
                    {brd.raw_input || brd.projectName || 'Untitled'}
                  </span>
                  <div className="mt-2">
                    <AiAuditSummary
                      compact
                      ai={{
                        provider: brd.ai_provider,
                        model: brd.ai_model,
                        task: brd.ai_task,
                        isExternal: brd.ai_is_external,
                        generatedAt: brd.ai_generated_at,
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-2 border-b">
                  {new Date(brd.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 border-b">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => handleOpenModal(brd.id)}
                  >
                    View Sprints
                  </button>
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
        </table>
        {modalOpen && activeBrdId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4">Sprint Details</h3>
            {Array.isArray(activeSprints) && activeSprints.length > 0 ? (
              activeSprints.map((sprint) => (
                <div key={sprint.id} className="mb-6">
                  <AiAuditSummary
                    ai={{
                      provider: sprint.ai_provider,
                      model: sprint.ai_model,
                      task: sprint.ai_task,
                      isExternal: sprint.ai_is_external,
                      generatedAt: sprint.ai_generated_at,
                    }}
                  />
                  <div className="mb-2">
                    <strong>Team Members:</strong> {sprint.team_members} |{' '}
                    <strong>Capacity/Member:</strong> {sprint.capacity_per_member} |{' '}
                    <strong>Sprint Duration (weeks):</strong> {sprint.sprint_duration} |{' '}
                    <strong>Velocity:</strong> {sprint.velocity}
                  </div>
                  <div className="mb-2">
                    <strong>Total Stories:</strong> {sprint.stories_count} |{' '}
                    <strong>Suggested Story Points/Sprint:</strong>{' '}
                    {sprint.suggested_story_points}
                  </div>
                  <h4 className="font-semibold mt-4 mb-2">Epics & Stories</h4>
                  <table className="min-w-full bg-white border rounded mb-4">
                    <thead>
                      <tr>
                        <th className="text-start px-2 py-1 border-b">Epic</th>
                        <th className="text-start px-2 py-1 border-b">Story</th>
                        <th className="text-start px-2 py-1 border-b">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprint.story_groups?.map((epic: any) =>
                        epic.stories?.map((story: any) => (
                          <tr key={story.id || story}>
                            <td className="px-2 py-1 border-b">
                              {epic.name || epic.epic}
                            </td>
                            <td className="px-2 py-1 border-b">
                              {story.title || story}
                            </td>
                            <td className="px-2 py-1 border-b">
                              {story.storyPoints || epic.storyPoints}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <h4 className="font-semibold mt-4 mb-2">Sprint Breakdown</h4>
                  <table className="min-w-full bg-white border rounded">
                    <thead>
                      <tr>
                        <th className="text-start px-2 py-1 border-b">Sprint #</th>
                        <th className="text-start px-2 py-1 border-b">Goal</th>
                        <th className="text-start px-2 py-1 border-b">Story Points</th>
                        <th className="text-start px-2 py-1 border-b">Stories Planned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sprint.sprint_breakdown?.map((sb: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-2 py-1 border-b">
                            {sb.sprintNumber || sb.sprint}
                          </td>
                          <td className="px-2 py-1 border-b">
                            {sb.goal || 'Planned sprint execution'}
                          </td>
                          <td className="px-2 py-1 border-b">
                            {sb.capacityStoryPoints || sb.totalStoryPoints}
                          </td>
                          <td className="px-2 py-1 border-b">
                            {sb.storiesPlanned?.map((sp: any) => (
                              <div key={sp.id}>
                                <span className="font-semibold">{sp.id}</span> (Epic:{' '}
                                {sp.epicId}, Points: {sp.storyPoints})
                              </div>
                            )) ||
                              sb.stories?.map((story: string) => (
                                <div key={story}>{story}</div>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">Sprint not created</div>
            )}
          </div>
        </div>
        )}
      </div>
    </RequireAppAccess>
  )
}
