'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ToolPage from '@/components/ToolPage'

export default function SupportPlannerPage() {
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
      title="L1/L2 Support Planner"
      description="Extract operational and support workflows with incident handling matrix"
      systemPrompt="You are an expert IT operations and support specialist. Analyze the provided documentation and generate a comprehensive L1/L2 Support Plan in Markdown format. The plan should include: 1. Support Tiers Overview, 2. Incident Classification Matrix, 3. Escalation Procedures, 4. Common Issues and Solutions, 5. Knowledge Base Structure, 6. SLA Guidelines, 7. Support Workflows. Format as Markdown with clear sections, tables for matrices, and step-by-step procedures."
      apiEndpoint="/api/generate-tool-output"
      toolType="support-planner"
    />
  )
}




