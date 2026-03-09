/**
 * Shared file processing utilities
 */

import { parseCSV, parseExcel, isCSV, isExcel } from './fileParsers'

/**
 * Read file content and convert to text description
 */
export async function readFileContent(file: File): Promise<string> {
  if (isCSV(file.name)) {
    const reader = new FileReader()
    return new Promise<string>((resolve, reject) => {
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
    return await parseExcel(file)
  } else {
    const reader = new FileReader()
    return new Promise<string>((resolve, reject) => {
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }
}

/**
 * Combine file content and text input
 */
export function combineInputs(fileContent: string, textInput: string): string {
  const parts: string[] = []
  
  if (fileContent.trim()) {
    parts.push('=== File Content ===\n' + fileContent)
  }
  
  if (textInput.trim()) {
    parts.push('=== Additional Notes ===\n' + textInput)
  }
  
  return parts.join('\n\n')
}




