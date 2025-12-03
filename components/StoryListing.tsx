'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

export interface Story {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  storyPoints: number
  epic: string
}

interface StoryListingProps {
  stories: Story[]
  epics?: string[]
  onSaveChanges: (stories: Story[]) => void | Promise<void>
  isLoading?: boolean
}

export default function StoryListing({
  stories: initialStories,
  epics = ['Feature Development', 'Bug Fixes', 'Performance', 'Security', 'Infrastructure'],
  onSaveChanges,
  isLoading = false,
}: StoryListingProps) {
  const [stories, setStories] = useState<Story[]>(initialStories)
  const [isSaving, setIsSaving] = useState(false)
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setStories(initialStories)
  }, [initialStories])

  const handleTitleChange = (storyId: string, newTitle: string) => {
    setStories(
      stories.map((story) =>
        story.id === storyId ? { ...story, title: newTitle } : story
      )
    )
  }

  const handleDescriptionChange = (storyId: string, newDescription: string) => {
    setStories(
      stories.map((story) =>
        story.id === storyId ? { ...story, description: newDescription } : story
      )
    )
  }

  const handleAcceptanceCriteriaChange = (
    storyId: string,
    criteriaIndex: number,
    newValue: string
  ) => {
    setStories(
      stories.map((story) => {
        if (story.id === storyId) {
          const newCriteria = [...story.acceptanceCriteria]
          newCriteria[criteriaIndex] = newValue
          return { ...story, acceptanceCriteria: newCriteria }
        }
        return story
      })
    )
  }

  const handleAddAcceptanceCriteria = (storyId: string) => {
    setStories(
      stories.map((story) =>
        story.id === storyId
          ? { ...story, acceptanceCriteria: [...story.acceptanceCriteria, ''] }
          : story
      )
    )
  }

  const handleRemoveAcceptanceCriteria = (storyId: string, criteriaIndex: number) => {
    setStories(
      stories.map((story) => {
        if (story.id === storyId) {
          const newCriteria = story.acceptanceCriteria.filter((_, i) => i !== criteriaIndex)
          return { ...story, acceptanceCriteria: newCriteria }
        }
        return story
      })
    )
  }

  const handleStoryPointsChange = (storyId: string, newPoints: number) => {
    setStories(
      stories.map((story) =>
        story.id === storyId ? { ...story, storyPoints: newPoints } : story
      )
    )
  }

  const handleEpicChange = (storyId: string, newEpic: string) => {
    setStories(
      stories.map((story) =>
        story.id === storyId ? { ...story, epic: newEpic } : story
      )
    )
  }

  const handleSaveChanges = async () => {
    setIsSaving(true)
    setSuccessMessage('')
    try {
      await onSaveChanges(stories)
      setSuccessMessage('Changes saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error saving changes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }

  if (stories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No stories to display</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {stories.map((story) => (
          <div
            key={story.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 space-y-4"
          >
            {/* Title Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Story Title
              </label>
              <input
                type="text"
                value={story.title}
                onChange={(e) => handleTitleChange(story.id, e.target.value)}
                placeholder="Enter story title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
              />
            </div>

            {/* Description Section */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Description
              </label>
              {editingDescriptionId === story.id ? (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={story.description}
                    onChange={(value) => handleDescriptionChange(story.id, value)}
                    modules={quillModules}
                    className="h-32"
                  />
                  <button
                    onClick={() => setEditingDescriptionId(null)}
                    className="w-full px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border-t border-gray-300 transition-colors"
                  >
                    Done Editing
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingDescriptionId(story.id)}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors text-sm text-gray-700"
                >
                  {story.description ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: story.description }}
                      className="prose prose-sm max-w-none"
                    />
                  ) : (
                    <span className="text-gray-400 italic">Click to add description...</span>
                  )}
                </button>
              )}
            </div>

            {/* Story Points */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Story Points
                </label>
                <input
                  type="number"
                  min="0"
                  value={story.storyPoints}
                  onChange={(e) => handleStoryPointsChange(story.id, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Epic Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Epic
                </label>
                <select
                  value={story.epic}
                  onChange={(e) => handleEpicChange(story.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Epic</option>
                  {epics.map((epic) => (
                    <option key={epic} value={epic}>
                      {epic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Acceptance Criteria
                </label>
                <button
                  onClick={() => handleAddAcceptanceCriteria(story.id)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                >
                  + Add Criteria
                </button>
              </div>
              <div className="space-y-2">
                {story.acceptanceCriteria.length > 0 ? (
                  story.acceptanceCriteria.map((criteria, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="text-gray-400 mt-2">•</span>
                      <input
                        type="text"
                        value={criteria}
                        onChange={(e) =>
                          handleAcceptanceCriteriaChange(story.id, index, e.target.value)
                        }
                        placeholder={`Criteria ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <button
                        onClick={() => handleRemoveAcceptanceCriteria(story.id, index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No criteria added yet</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-end">
        {successMessage && (
          <div className="mr-4 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {successMessage}
          </div>
        )}
        <button
          onClick={handleSaveChanges}
          disabled={isSaving || isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          {isSaving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
