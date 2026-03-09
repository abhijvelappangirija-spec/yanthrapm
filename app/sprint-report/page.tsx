'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ToolPage from '@/components/ToolPage'

export default function SprintReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <ToolPage
      title="Sprint Report Generator"
      description="Summarize imported backlog CSV into formatted sprint plans and reports"
      systemPrompt="You are an expert Agile coach and Scrum Master. Analyze the provided backlog data and generate a comprehensive sprint report in Markdown format. The report should include: 1. Sprint Overview, 2. Backlog Summary, 3. Story Breakdown, 4. Estimated Velocity, 5. Risk Assessment, 6. Recommendations. Format as Markdown with clear sections and bullet points."
      apiEndpoint="/api/generate-tool-output"
      toolType="sprint-report"
    />
  )
}




