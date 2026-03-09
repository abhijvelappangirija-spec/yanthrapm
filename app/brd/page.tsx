'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ToolPage from '@/components/ToolPage'

export default function BRDPage() {
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
      title="BRD Generator"
      description="Generate comprehensive Business Requirements Documents from your input files or text"
      systemPrompt="You are an expert business analyst. Generate a comprehensive Business Requirements Document (BRD) in Markdown format based on the provided input. The BRD should include: 1. Executive Summary, 2. Business Objectives, 3. Functional Requirements (detailed), 4. Non-Functional Requirements (performance, security, scalability), 5. Assumptions and Constraints, 6. Success Criteria. Format the output as Markdown with proper headings, paragraphs, and lists."
      apiEndpoint="/api/generate-tool-output"
      toolType="brd"
    />
  )
}




