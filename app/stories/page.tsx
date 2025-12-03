'use client'

import { useState } from 'react'
import StoryListing, { Story } from '@/components/StoryListing'

const SAMPLE_STORIES: Story[] = [
  {
    id: 'story-1',
    title: 'User Authentication Setup',
    description: '<p>Implement user <strong>authentication</strong> system with email and password login capabilities</p>',
    acceptanceCriteria: [
      'Users can register with email and password',
      'Password must be at least 8 characters',
      'Email verification is sent after registration',
      'Users can login with correct credentials',
    ],
    storyPoints: 8,
    epic: 'Feature Development',
  },
  {
    id: 'story-2',
    title: 'Dashboard Layout',
    description: '<p>Create responsive dashboard with <em>navigation</em> and key metrics display</p>',
    acceptanceCriteria: [
      'Layout is responsive on mobile, tablet, and desktop',
      'Navigation menu collapses on mobile',
      'Shows 4 key metrics on the main view',
    ],
    storyPoints: 5,
    epic: 'Feature Development',
  },
  {
    id: 'story-3',
    title: 'Database Performance Optimization',
    description: '<p>Optimize database queries to reduce <strong>response time</strong> by 30%</p>',
    acceptanceCriteria: [
      'Add indexes to frequently queried columns',
      'Implement query caching',
      'Response time reduced to under 100ms',
      'Load tests pass with 1000 concurrent users',
    ],
    storyPoints: 13,
    epic: 'Performance',
  },
  {
    id: 'story-4',
    title: 'Fix Login Page Bug',
    description: '<p>Fix issue where login fails on <strong>Safari</strong> browser</p>',
    acceptanceCriteria: [
      'Login works on Safari latest version',
      'Password field shows correctly',
      'Form submission works',
    ],
    storyPoints: 3,
    epic: 'Bug Fixes',
  },
]

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>(SAMPLE_STORIES)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSaveChanges = async (updatedStories: Story[]) => {
    setIsSaving(true)
    setMessage('')

    try {
      // Simulate API call - replace with actual API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update local state
      setStories(updatedStories)
      setMessage('Stories updated successfully!')

      // Here you would typically call an API endpoint like:
      // const response = await fetch('/api/stories/update', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ stories: updatedStories }),
      // })

      console.log('Updated stories:', updatedStories)
    } catch (error) {
      console.error('Error saving stories:', error)
      setMessage('Error saving stories. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Story Management</h1>
          <p className="text-gray-600">
            Edit your stories below. Make changes to titles, descriptions, acceptance criteria, story points, and epics.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg ${
              message.includes('Error')
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}
          >
            {message}
          </div>
        )}

        <StoryListing
          stories={stories}
          epics={[
            'Feature Development',
            'Bug Fixes',
            'Performance',
            'Security',
            'Infrastructure',
            'Documentation',
          ]}
          onSaveChanges={handleSaveChanges}
          isLoading={isSaving}
        />

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Component Usage</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`import StoryListing, { Story } from '@/components/StoryListing'

// Define your stories
const stories: Story[] = [
  {
    id: 'story-1',
    title: 'User Authentication',
    description: '<p>HTML description</p>',
    acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    storyPoints: 8,
    epic: 'Feature Development',
  },
]

// Handle save changes
const handleSaveChanges = async (stories: Story[]) => {
  await fetch('/api/stories/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stories }),
  })
}

// Use the component
<StoryListing
  stories={stories}
  epics={['Feature Development', 'Bug Fixes']}
  onSaveChanges={handleSaveChanges}
  isLoading={false}
/>`}
          </pre>
        </div>
      </div>
    </main>
  )
}
