'use client'

import { useCallback, useState } from 'react'
import { parseCSV, parseExcel, isCSV, isExcel } from '@/lib/fileParsers'

interface FileUploadZoneProps {
  onFileSelect: (content: string) => void
}

export default function FileUploadZone({ onFileSelect }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [])

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setIsProcessing(true)

    try {
      let content: string

      if (isCSV(file.name)) {
        // Parse CSV file
        const reader = new FileReader()
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            try {
              const text = e.target?.result as string
              const parsed = parseCSV(text)
              resolve(parsed)
            } catch (error) {
              reject(error)
            }
          }
          reader.onerror = () => reject(new Error('Failed to read CSV file'))
          reader.readAsText(file)
        })
      } else if (isExcel(file.name)) {
        // Parse Excel file
        content = await parseExcel(file)
      } else {
        // Regular text file
        const reader = new FileReader()
        content = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            resolve(e.target?.result as string)
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsText(file)
        })
      }

      onFileSelect(content)
    } catch (error) {
      console.error('Error processing file:', error)
      alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileInput}
        accept=".txt,.md,.doc,.docx,.csv,.xlsx,.xls"
      />
      <label
        htmlFor="file-upload"
        className="cursor-pointer block"
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">
          TXT, MD, DOC, DOCX, CSV, XLSX, XLS files
        </p>
        {isProcessing && (
          <p className="text-sm text-blue-600 mt-2 font-medium">
            Processing file...
          </p>
        )}
        {fileName && !isProcessing && (
          <p className="text-sm text-blue-600 mt-2 font-medium">
            Selected: {fileName}
          </p>
        )}
      </label>
    </div>
  )
}

