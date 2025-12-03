'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface BRDViewerProps {
  initialContent: string
  onContentChange?: (content: string) => void
}

export default function BRDViewer({ initialContent, onContentChange }: BRDViewerProps) {
  const [content, setContent] = useState(initialContent)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  const handleChange = (value: string) => {
    setContent(value)
    onContentChange?.(value)
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">BRD Document</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isEditing ? 'View Mode' : 'Edit Mode'}
        </button>
      </div>
      <div className="bg-white">
        {isEditing ? (
          <ReactQuill
            theme="snow"
            value={content}
            onChange={handleChange}
            modules={modules}
            className="min-h-[400px]"
          />
        ) : (
          <div
            className="p-6 min-h-[400px]"
            style={{
              lineHeight: '1.75',
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  )
}

