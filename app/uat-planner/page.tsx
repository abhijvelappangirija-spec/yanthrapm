'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ToolPage from '@/components/ToolPage'

export default function UATPlannerPage() {
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
      title="UAT Planner"
      description="Extract acceptance scenarios and test plans from requirements files"
      systemPrompt="You are an expert QA engineer and UAT specialist. Analyze the provided requirements and generate a comprehensive User Acceptance Testing (UAT) plan in Markdown format. The plan should include: 1. Test Scope, 2. Acceptance Criteria, 3. Test Scenarios, 4. Test Cases with steps, 5. Test Data Requirements, 6. Sign-off Criteria. Format as Markdown with clear sections, numbered lists, and tables where appropriate."
      apiEndpoint="/api/generate-tool-output"
      toolType="uat-planner"
    />
  )
}




