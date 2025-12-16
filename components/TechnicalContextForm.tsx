'use client'

import { useState } from 'react'

interface TechnicalContextFormProps {
  initialValue?: string
  onSave: (context: string) => void
  onProceed: (context: string) => void
  onSkip?: () => void
}

export default function TechnicalContextForm({
  initialValue = '',
  onSave,
  onProceed,
  onSkip,
}: TechnicalContextFormProps) {
  const [technicalContext, setTechnicalContext] = useState(initialValue)

  const exampleContexts = [
    'We use Next.js 15 with App Router and React Server Components',
    'Backend APIs are on Express with PostgreSQL via Prisma',
    'Auth uses NextAuth + Google SSO',
    'Legacy modules written in Angular must not be modified',
  ]

  const handleSave = () => {
    onSave(technicalContext)
  }

  const handleProceed = () => {
    onProceed(technicalContext)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Add Technical Context
        </h2>
        <p className="text-sm text-gray-600">
          Provide technical information that will help the AI generate a more accurate sprint plan
          based on your existing architecture and constraints.
        </p>
      </div>

      <div>
        <label
          htmlFor="technicalContext"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Add any additional technical information that the LLM should consider when generating the Sprint Plan.
        </label>
        <textarea
          id="technicalContext"
          value={technicalContext}
          onChange={(e) => setTechnicalContext(e.target.value)}
          placeholder="Enter technical context such as:
- Existing architecture
- Technology stack and framework versions
- Integrations
- Constraints
- Repository structure
- DevOps pipelines
- System history"
          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-2 text-xs text-gray-500">
          This information will be used as architectural constraints when generating the sprint plan.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Examples:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          {exampleContexts.map((example, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>{example}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={!technicalContext.trim()}
          className="flex-1 bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Save Context
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="px-6 py-3 text-gray-700 font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
        )}
        <button
          onClick={handleProceed}
          className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Proceed to Sprint Planning
        </button>
      </div>
    </div>
  )
}

