'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import FileUploader from './FileUploader'
import ModelSelector from './ModelSelector'
import MarkdownOutput from './MarkdownOutput'
import LoadingSpinner from './LoadingSpinner'
import Navbar from './Navbar'

interface ToolPageProps {
  title: string
  description: string
  systemPrompt: string
  apiEndpoint: string
  toolType: string
}

export default function ToolPage({ title, description, systemPrompt, apiEndpoint, toolType }: ToolPageProps) {
  const { data: session } = useSession()
  const [fileContent, setFileContent] = useState('')
  const [textInput, setTextInput] = useState('')
  const [model, setModel] = useState('sonar-pro')
  const [output, setOutput] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)

  const handleGenerate = async () => {
    const combinedInput = fileContent || textInput
    if (!combinedInput.trim()) {
      setError('Please upload a file or enter text')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: combinedInput,
          model,
          systemPrompt,
          userId: session?.user?.id || session?.user?.email || 'anonymous',
          toolType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate output')
      }

      setOutput(data.output || data.content || data.result)
      setItemId(data.id || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    if (!output) return
    const blob = new Blob([output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="mt-2 text-gray-600">{description}</p>
        </div>

        {!output ? (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Upload File
              </h2>
              <FileUploader onFileSelect={setFileContent} />
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Or Enter Text Manually
              </h2>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter your input here..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <ModelSelector value={model} onChange={setModel} />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isLoading || (!fileContent.trim() && !textInput.trim())}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Generating...' : `Generate ${title}`}
            </button>

            {isLoading && <LoadingSpinner />}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <MarkdownOutput content={output} onExport={handleExport} />

            <button
              onClick={() => {
                setOutput(null)
                setFileContent('')
                setTextInput('')
                setItemId(null)
                setError(null)
              }}
              className="w-full bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Generate New
            </button>
          </div>
        )}
      </div>
    </div>
  )
}




