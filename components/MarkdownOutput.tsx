'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownOutputProps {
  content: string
  onExport?: () => void
  showExport?: boolean
}

export default function MarkdownOutput({ content, onExport, showExport = true }: MarkdownOutputProps) {
  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      const blob = new Blob([content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `export-${Date.now()}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Generated Output</h3>
        {showExport && (
          <button
            onClick={handleExport}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export Markdown
          </button>
        )}
      </div>
      <div className="bg-white p-6 max-h-[600px] overflow-y-auto prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}




