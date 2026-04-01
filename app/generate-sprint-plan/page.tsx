'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AiAuditSummary from '@/components/AiAuditSummary'
import BrdGovernanceSummary, {
  type BrdGovernanceSummaryProps,
} from '@/components/BrdGovernanceSummary'
import RetrievalExecutionSummary, {
  type RetrievalExecutionSummaryProps,
} from '@/components/RetrievalExecutionSummary'
import RequireAppAccess from '@/components/auth/RequireAppAccess'
import LoadingSpinner from '@/components/LoadingSpinner'
import BRDViewer from '@/components/BRDViewer'
import SprintPlanner from '@/components/SprintPlanner'
import TechnicalContextForm from '@/components/TechnicalContextForm'
import FileUploadZone from '@/components/FileUploadZone'
import type { AiGenerationMetadata } from '@/lib/ai/types'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { formatClientApiErrorMessage } from '@/lib/format-client-api-error'

type WorkflowStep = 'select-brd' | 'brd' | 'technical-context' | 'sprint-plan'

interface BRD {
  id: string
  user_id: string
  raw_input: string
  brd_text: string
  created_at: string
  ai_provider?: string | null
  ai_model?: string | null
  ai_task?: string | null
  ai_is_external?: boolean | null
  ai_generated_at?: string | null
}

interface Project {
  id: string
  name: string
  team_members: number
  capacity_per_member: number
  sprint_duration: number
  tech_stack?: string
  roles?: string[]
  resources?: Array<{
    id: string
    name: string
    tech_stack: string
    capacity: number
  }>
}

function GenerateSprintPlanPageContent() {
  const searchParams = useSearchParams()
  const [brds, setBrds] = useState<BRD[]>([])
  const [selectedBrd, setSelectedBrd] = useState<BRD | null>(null)
  const [brdContent, setBrdContent] = useState<string | null>(null)
  const [technicalContext, setTechnicalContext] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('select-brd')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBrds, setIsLoadingBrds] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [brdId, setBrdId] = useState<string | null>(null)
  const [useDummyData, setUseDummyData] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [brdSource, setBrdSource] = useState<'database' | 'upload'>('database')
  const [uploadedBrdContent, setUploadedBrdContent] = useState<string>('')
  const [uploadedBrdAiMetadata, setUploadedBrdAiMetadata] = useState<AiGenerationMetadata | null>(null)
  const [uploadedRetrievalExecution, setUploadedRetrievalExecution] = useState<
    RetrievalExecutionSummaryProps['execution']
  >(null)
  const [uploadedBrdGovernance, setUploadedBrdGovernance] =
    useState<BrdGovernanceSummaryProps['governance']>(null)
  const [requirePrivateProcessing, setRequirePrivateProcessing] = useState(false)

  useEffect(() => {
    if (brdSource === 'database') {
      loadBRDs()
    }
    loadProjects()
    const projectId = searchParams?.get('projectId')
    if (projectId) {
      loadProject(projectId)
    }
  }, [searchParams, brdSource])

  const loadBRDs = async () => {
    try {
      setIsLoadingBrds(true)
      const response = await fetchWithAuth('/api/brds')
      if (response.ok) {
        const data = await response.json()
        setBrds(data.brds || [])
      } else {
        setError('Failed to load BRDs')
      }
    } catch (err) {
      console.error('Error loading BRDs:', err)
      setError('Failed to load BRDs')
    } finally {
      setIsLoadingBrds(false)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await fetchWithAuth('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setAvailableProjects(data.projects || [])
      }
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  const loadProject = async (projectId: string) => {
    try {
      const response = await fetchWithAuth(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedProject(data.project)
      }
    } catch (err) {
      console.error('Error loading project:', err)
    }
  }

  const handleSelectBRD = async (brd: BRD) => {
    setIsLoading(true)
    setError(null)
    try {
      // Load technical context if it exists
      const contextResponse = await fetchWithAuth(`/api/technical-context/${brd.id}`)
      if (contextResponse.ok) {
        const contextData = await contextResponse.json()
        if (contextData.technicalContext) {
          setTechnicalContext(contextData.technicalContext)
        }
      }

      setSelectedBrd(brd)
      setBrdContent(brd.brd_text)
      setBrdId(brd.id)
      setUploadedBrdAiMetadata(null)
      setUploadedRetrievalExecution(null)
      setUploadedBrdGovernance(null)
      setCurrentStep('brd')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load BRD')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (content: string) => {
    setUploadedBrdContent(content)
    setError(null)
    setIsLoading(true)
    
    try {
      // Send to Perplexity to generate improved BRD
      const response = await fetchWithAuth('/api/generate-brd-from-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent: content,
          useDummyData,
          requirePrivateProcessing,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(formatClientApiErrorMessage(data, 'Failed to generate BRD from file'))
      }

      // Use the generated BRD
      setBrdContent(data.brd)
      setSelectedBrd(null) // No database BRD selected
      setBrdId(null) // No BRD ID since it's uploaded
      setUploadedBrdAiMetadata(data.ai || null)
      setUploadedRetrievalExecution(data.retrievalExecution ?? null)
      setUploadedBrdGovernance(data.governance ?? null)
      setCurrentStep('brd')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process uploaded file')
      // Fallback: use uploaded content directly if generation fails
      setBrdContent(content)
      setUploadedBrdAiMetadata(null)
      setUploadedRetrievalExecution(null)
      setUploadedBrdGovernance(null)
      setCurrentStep('brd')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveUploadedBRD = async () => {
    if (!brdContent) return

    setIsLoading(true)
    setError(null)
    try {
      // Create a new API endpoint call to save the BRD directly
      const response = await fetchWithAuth('/api/save-brd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_input: uploadedBrdContent || brdContent.substring(0, 500), // Use first 500 chars as raw input
          brd_text: brdContent, // Save the uploaded content as BRD text
          ai: uploadedBrdAiMetadata,
          governance: uploadedBrdGovernance,
          retrievalExecution: uploadedRetrievalExecution,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save BRD')
      }

      // Update with the saved BRD ID
      setBrdId(data.id)
      // Reload BRDs to include the newly saved one
      await loadBRDs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save BRD')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProceedToTechnicalContext = () => {
    setCurrentStep('technical-context')
  }

  const handleSaveTechnicalContext = async (context: string) => {
    setTechnicalContext(context)
    // Optionally save to database
    if (brdId) {
      try {
        await fetchWithAuth('/api/save-technical-context', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brdId,
            technicalContext: context,
          }),
        })
      } catch (err) {
        console.error('Error saving technical context:', err)
      }
    }
  }

  const handleProceedToSprintPlanning = (context: string) => {
    setTechnicalContext(context)
    setCurrentStep('sprint-plan')
  }

  const handleSkipTechnicalContext = () => {
    setCurrentStep('sprint-plan')
  }

  const handleBRDContentChange = async (content: string) => {
    setBrdContent(content)
    // Optionally update in Supabase
    if (brdId) {
      try {
        await fetchWithAuth('/api/update-brd', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: brdId,
            brd_text: content,
          }),
        })
      } catch (err) {
        console.error('Error updating BRD:', err)
      }
    }
  }

  const handleStartOver = () => {
    setSelectedBrd(null)
    setBrdContent(null)
    setTechnicalContext('')
    setBrdId(null)
    setUploadedBrdAiMetadata(null)
    setUploadedRetrievalExecution(null)
    setUploadedBrdGovernance(null)
    setUploadedBrdContent('')
    setError(null)
    setCurrentStep('select-brd')
  }

  return (
    <RequireAppAccess>
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Generate Sprint Plan</h1>
            {selectedProject && (
              <p className="text-sm text-gray-600 mt-1">
                Using project: <span className="font-semibold">{selectedProject.name}</span>
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <Link
              href="/projects"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Manage Projects
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* BRD Selection Step */}
        {currentStep === 'select-brd' && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                Select or Upload BRD
              </h2>
              <p className="text-gray-600 mb-6">
                Choose an existing BRD from your saved documents or upload a new BRD file.
              </p>
            </div>

            {/* Source Selection Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setBrdSource('database')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    brdSource === 'database'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Select from Database
                </button>
                <button
                  onClick={() => setBrdSource('upload')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    brdSource === 'upload'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Upload BRD File
                </button>
              </nav>
            </div>

            {/* Project Selection */}
            {availableProjects.length > 0 && (
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project (Optional)
                </label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const projectId = e.target.value
                    if (projectId) {
                      loadProject(projectId)
                    } else {
                      setSelectedProject(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No project selected</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Project defaults will be applied to sprint planning
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <input
                type="checkbox"
                id="useDummyData"
                checked={useDummyData}
                onChange={(e) => setUseDummyData(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useDummyData" className="text-sm text-gray-700 cursor-pointer">
                Use dummy data only (skips Perplexity/Ollama — for quick UI checks without API keys)
              </label>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <input
                type="checkbox"
                id="requirePrivateProcessing"
                checked={requirePrivateProcessing}
                onChange={(e) => setRequirePrivateProcessing(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label
                htmlFor="requirePrivateProcessing"
                className="text-sm text-gray-700 cursor-pointer"
              >
                Sensitive input: require private/local AI processing only
              </label>
            </div>

            {/* Database Selection */}
            {brdSource === 'database' && (
              <>
                {isLoadingBrds ? (
                  <div className="text-center py-12">
                    <LoadingSpinner />
                    <p className="text-gray-600 mt-4">Loading BRDs...</p>
                  </div>
                ) : brds.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-600 mb-4">No BRDs found.</p>
                    <Link
                      href="/brd-generator"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Create a new BRD →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {brds.map((brd) => (
                      <div
                        key={brd.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleSelectBRD(brd)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                BRD - {new Date(brd.created_at).toLocaleDateString()}
                              </h3>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {brd.id.substring(0, 8)}...
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {brd.raw_input.substring(0, 150)}...
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Created: {new Date(brd.created_at).toLocaleString()}
                            </p>
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
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectBRD(brd)
                            }}
                            className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* File Upload */}
            {brdSource === 'upload' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Upload BRD File
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload an existing BRD document (TXT, MD, DOC, DOCX, HTML, or any text format). 
                    The file will be analyzed and enhanced using AI to generate a comprehensive BRD.
                  </p>
                  {isLoading ? (
                    <div className="text-center py-12">
                      <LoadingSpinner />
                      <p className="text-gray-600 mt-4">Analyzing file and generating enhanced BRD...</p>
                    </div>
                  ) : (
                    <FileUploadZone onFileSelect={handleFileUpload} />
                  )}
                </div>
                {uploadedBrdContent && !isLoading && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      ✓ BRD file processed and enhanced. Review the generated BRD below.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BRD View Step */}
        {currentStep === 'brd' && brdContent && (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-gray-700">
                  {selectedBrd ? 'Selected BRD' : 'Uploaded BRD'}
                </h2>
                {useDummyData && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ Using dummy data for testing
                  </p>
                )}
                {requirePrivateProcessing && (
                  <p className="text-sm text-emerald-700 mt-1">
                    Sensitive mode: private/local AI routing required
                  </p>
                )}
                {!selectedBrd && !brdId && (
                  <p className="text-sm text-gray-600 mt-1">
                    This BRD is not saved to the database. You can save it below.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleStartOver}
                  className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  {selectedBrd ? 'Select Different BRD' : 'Upload Different BRD'}
                </button>
                {!selectedBrd && !brdId && (
                  <button
                    onClick={handleSaveUploadedBRD}
                    disabled={isLoading}
                    className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isLoading ? 'Saving...' : 'Save to Database'}
                  </button>
                )}
                <button
                  onClick={handleProceedToTechnicalContext}
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue to Technical Context →
                </button>
              </div>
            </div>

            <AiAuditSummary
              ai={
                selectedBrd
                  ? {
                      provider: selectedBrd.ai_provider,
                      model: selectedBrd.ai_model,
                      task: selectedBrd.ai_task,
                      isExternal: selectedBrd.ai_is_external,
                      generatedAt: selectedBrd.ai_generated_at,
                    }
                  : uploadedBrdAiMetadata
              }
            />
            {!selectedBrd && (
              <>
                <RetrievalExecutionSummary execution={uploadedRetrievalExecution} />
                <BrdGovernanceSummary governance={uploadedBrdGovernance} />
              </>
            )}
            <BRDViewer
              initialContent={brdContent}
              onContentChange={handleBRDContentChange}
            />
          </div>
        )}

        {/* Workflow Progress Indicator */}
        {brdContent && currentStep !== 'select-brd' && (
          <div className="mt-6 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center text-blue-600">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium">BRD Selected</span>
              </div>
              <div className={`w-16 h-1 ${currentStep === 'technical-context' || currentStep === 'sprint-plan' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center ${currentStep === 'technical-context' || currentStep === 'sprint-plan' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'technical-context' || currentStep === 'sprint-plan' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                  {currentStep === 'sprint-plan' ? '✓' : '2'}
                </div>
                <span className="ml-2 text-sm font-medium">Technical Context</span>
              </div>
              <div className={`w-16 h-1 ${currentStep === 'sprint-plan' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center ${currentStep === 'sprint-plan' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'sprint-plan' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Sprint Plan</span>
              </div>
            </div>
          </div>
        )}

        {/* Technical Context Step */}
        {brdContent && currentStep === 'technical-context' && (
          <div className="mt-6">
            <TechnicalContextForm
              initialValue={technicalContext}
              onSave={handleSaveTechnicalContext}
              onProceed={handleProceedToSprintPlanning}
              onSkip={handleSkipTechnicalContext}
            />
          </div>
        )}

        {/* Sprint Planning Step */}
        {brdContent && currentStep === 'sprint-plan' && (
          <div className="mt-6">
            <SprintPlanner
              brdText={brdContent}
              brdId={brdId}
              technicalContext={technicalContext}
              useDummyData={useDummyData}
              requirePrivateProcessing={requirePrivateProcessing}
              projectDefaults={selectedProject ? {
                teamMembers: selectedProject.team_members,
                capacityPerMember: selectedProject.capacity_per_member,
                sprintDuration: selectedProject.sprint_duration,
                techStack: selectedProject.tech_stack,
                roles: selectedProject.roles,
              } : undefined}
            />
          </div>
        )}
        </div>
      </main>
    </RequireAppAccess>
  )
}

export default function GenerateSprintPlanPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GenerateSprintPlanPageContent />
    </Suspense>
  )
}
