'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface BRDViewerProps {
  initialContent: string
  onContentChange?: (content: string) => void
}

/**
 * Normalize HTML content for display
 * - Extracts body content if it's a full HTML document
 * - Converts plain text/markdown to HTML if needed
 * - Returns clean HTML ready for rendering
 */
function normalizeHTMLContent(content: string): string {
  if (!content || !content.trim()) {
    return '<p class="text-gray-400 italic">No content available</p>'
  }

  let normalized = content.trim()

  // Check if it's a full HTML document
  const hasHTMLTag = /<html[^>]*>/i.test(normalized)
  const hasBodyTag = /<body[^>]*>/i.test(normalized)

  if (hasHTMLTag || hasBodyTag) {
    // Extract body content
    const bodyMatch = normalized.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) {
      normalized = bodyMatch[1]
    } else {
      // If no body tag but has html tag, extract content between html tags
      const htmlMatch = normalized.match(/<html[^>]*>([\s\S]*?)<\/html>/i)
      if (htmlMatch) {
        normalized = htmlMatch[1]
        // Remove head tag and its content if present
        normalized = normalized.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      }
    }
  }

  // Check if it's HTML (has HTML tags)
  const hasHTMLTags = /<[a-z][\s\S]*>/i.test(normalized)
  
  if (!hasHTMLTags) {
    // It's plain text or markdown, convert to HTML
    normalized = convertTextToHTML(normalized)
  }

  return normalized.trim()
}

/**
 * Convert plain text or markdown to HTML
 */
function convertTextToHTML(text: string): string {
  let html = text

  // Convert markdown headings
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-5 mb-3">$1</h2>')
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg font-semibold mt-3 mb-2">$1</h4>')

  // Convert markdown lists
  html = html.replace(/^(\d+)\.\s+(.*)$/gim, '<li class="ml-4 mb-1">$2</li>')
  html = html.replace(/^[-*+]\s+(.*)$/gim, '<li class="ml-4 mb-1">$1</li>')

  // Wrap consecutive list items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
    return '<ul class="list-disc ml-6 my-2">' + match + '</ul>'
  })

  // Convert bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

  // Convert line breaks to paragraphs
  const lines = html.split('\n')
  const paragraphs: string[] = []
  let currentParagraph: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
      continue
    }

    if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</'))) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '))
        currentParagraph = []
      }
      paragraphs.push(trimmed)
    } else {
      currentParagraph.push(trimmed)
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '))
  }

  // Wrap non-tag content in paragraphs
  html = paragraphs.map(p => {
    if (p.startsWith('<')) {
      return p
    }
    return `<p class="mb-3">${p}</p>`
  }).join('\n')

  // Clean up double-wrapped paragraphs
  html = html.replace(/<p[^>]*><p[^>]*>/g, '<p class="mb-3">').replace(/<\/p><\/p>/g, '</p>')

  return html
}

export default function BRDViewer({ initialContent, onContentChange }: BRDViewerProps) {
  const [content, setContent] = useState(initialContent)
  const [displayContent, setDisplayContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setContent(initialContent)
    setDisplayContent(normalizeHTMLContent(initialContent))
  }, [initialContent])

  const handleChange = (value: string) => {
    setContent(value)
    setDisplayContent(normalizeHTMLContent(value))
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
          <>
            <style dangerouslySetInnerHTML={{ __html: `
              .brd-content h1 {
                font-size: 2rem;
                font-weight: bold;
                margin-top: 1.5rem;
                margin-bottom: 1rem;
                color: #111827;
              }
              .brd-content h2 {
                font-size: 1.5rem;
                font-weight: bold;
                margin-top: 1.25rem;
                margin-bottom: 0.75rem;
                color: #1f2937;
              }
              .brd-content h3 {
                font-size: 1.25rem;
                font-weight: 600;
                margin-top: 1rem;
                margin-bottom: 0.5rem;
                color: #374151;
              }
              .brd-content h4 {
                font-size: 1.125rem;
                font-weight: 600;
                margin-top: 0.75rem;
                margin-bottom: 0.5rem;
                color: #4b5563;
              }
              .brd-content p {
                margin-bottom: 0.75rem;
                line-height: 1.75;
                color: #374151;
              }
              .brd-content ul, .brd-content ol {
                margin-left: 1.5rem;
                margin-top: 0.5rem;
                margin-bottom: 0.75rem;
              }
              .brd-content ul {
                list-style-type: disc;
              }
              .brd-content ol {
                list-style-type: decimal;
              }
              .brd-content li {
                margin-bottom: 0.25rem;
                line-height: 1.6;
                color: #374151;
              }
              .brd-content strong {
                font-weight: 600;
                color: #111827;
              }
              .brd-content em {
                font-style: italic;
              }
            ` }} />
            <div
              className="p-6 min-h-[400px] brd-content"
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          </>
        )}
      </div>
    </div>
  )
}

