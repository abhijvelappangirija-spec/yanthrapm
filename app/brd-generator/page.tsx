'use client'

import { useState } from 'react'
import Link from 'next/link'
import FileUploadZone from '@/components/FileUploadZone'
import LoadingSpinner from '@/components/LoadingSpinner'
import BRDViewer from '@/components/BRDViewer'
import SprintPlanner from '@/components/SprintPlanner'
import { generateBRDPDF } from '@/components/BRDPDF'

export default function BRDGeneratorPage() {
  const [inputContent, setInputContent] = useState('')
  const [brdContent, setBrdContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brdId, setBrdId] = useState<string | null>(null)
  const [useDummyData, setUseDummyData] = useState(false)

  const handleFileSelect = (content: string) => {
    setInputContent(content)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputContent(e.target.value)
  }

  const handleGenerateBRD = async () => {
    if (!inputContent.trim()) {
      setError('Please upload a file or enter text')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-brd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: inputContent,
          userId: 'user-123', // Replace with actual user ID from auth
          useDummyData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate BRD')
      }

      setBrdContent(data.brd)
      setBrdId(data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!brdContent) return

    try {
      setIsLoading(true)
      const blob = await generateBRDPDF(brdContent)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `BRD-${brdId || Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Failed to generate PDF')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBRDContentChange = async (content: string) => {
    setBrdContent(content)
    // Optionally update in Supabase
    if (brdId) {
      try {
        await fetch('/api/update-brd', {
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

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">BRD Generator</h1>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {!brdContent ? (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Upload File
              </h2>
              <FileUploadZone onFileSelect={handleFileSelect} />
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Or Enter Text Manually
              </h2>
              <textarea
                value={inputContent}
                onChange={handleTextareaChange}
                placeholder="Enter your requirements, notes, or any text here..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
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
                Use dummy data for testing (saves Perplexity API tokens)
              </label>
            </div>

            <button
              onClick={handleGenerateBRD}
              disabled={isLoading || !inputContent.trim()}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Generating BRD...' : 'Generate BRD'}
            </button>

            {isLoading && <LoadingSpinner />}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold text-gray-700">
                  Generated BRD
                </h2>
                {useDummyData && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ Using dummy data for testing
                  </p>
                )}
              </div>
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Download BRD (PDF)
              </button>
            </div>

            <BRDViewer
              initialContent={brdContent}
              onContentChange={handleBRDContentChange}
            />

            <div className="border-t pt-6">
              <SprintPlanner brdText={brdContent} brdId={brdId} useDummyData={useDummyData} />
            </div>

            <button
              onClick={() => {
                setBrdContent(null)
                setInputContent('')
                setBrdId(null)
                setError(null)
              }}
              className="w-full bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Generate New BRD
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
