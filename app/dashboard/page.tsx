'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Dashboard() {
  const [userEmail] = useState('abhij.velappangirija@bounteous.com')

  const tools = [
    {
      id: 'brd-generator',
      title: 'BRD Generator',
      description: 'Generate comprehensive Business Requirements Documents from your input files or text',
      icon: '📄',
      href: '/brd-generator',
      status: 'available',
    },
    {
      id: 'sprint-report',
      title: 'Sprint Report Generator',
      description: 'Summarize imported backlog CSV into formatted sprint plans and reports',
      icon: '📊',
      href: '#',
      status: 'coming-soon',
    },
    {
      id: 'uat-planner',
      title: 'UAT Planner',
      description: 'Extract acceptance scenarios and test plans from requirements files',
      icon: '✓',
      href: '#',
      status: 'coming-soon',
    },
    {
      id: 'support-planner',
      title: 'L1/L2 Support Planner',
      description: 'Extract operational and support workflows with incident handling matrix',
      icon: '🔧',
      href: '#',
      status: 'coming-soon',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Tools Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userEmail}</span>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8" aria-label="Tabs">
            <button className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-gray-900">
              Dashboard
            </button>
            <button className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
              History
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <p className="text-gray-600 text-lg">Select a tool to get started</p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={`relative group ${
                tool.status === 'available'
                  ? 'cursor-pointer'
                  : 'opacity-75 cursor-not-allowed'
              }`}
            >
              {tool.status === 'available' ? (
                <Link href={tool.href}>
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 p-6 h-full border border-gray-200 hover:border-blue-300">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-3xl">{tool.icon}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tool.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 h-full border border-gray-200 relative">
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-3xl opacity-50">{tool.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-700">
                      {tool.title}
                    </h3>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">
                    {tool.description}
                  </p>
                  <div className="flex justify-center">
                    <span className="inline-block px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-full border border-yellow-200">
                      Coming Soon
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
