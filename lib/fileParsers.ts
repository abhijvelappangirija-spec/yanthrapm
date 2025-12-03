import * as XLSX from 'xlsx'

/**
 * Parse CSV file content to text
 */
export function parseCSV(content: string): string {
  const lines = content.split('\n')
  const rows: string[][] = []
  
  // Simple CSV parsing (handles quoted fields)
  for (const line of lines) {
    if (line.trim()) {
      const row: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++ // Skip next quote
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      row.push(current.trim())
      rows.push(row)
    }
  }
  
  // Convert to readable text format
  return rows.map(row => row.join(' | ')).join('\n')
}

/**
 * Parse Excel file (XLSX, XLS) to text
 */
export async function parseExcel(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        let result = ''
        
        // Process each sheet
        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          if (workbook.SheetNames.length > 1) {
            result += `\n=== Sheet: ${sheetName} ===\n\n`
          }
          
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          
          // Convert to readable format
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            // First row as headers (if it looks like headers)
            const rows = jsonData as any[][]
            
            rows.forEach((row, rowIndex) => {
              // Filter out empty rows
              if (row.some(cell => cell !== '' && cell != null)) {
                const formattedRow = row
                  .map(cell => {
                    if (cell === null || cell === undefined) return ''
                    return String(cell).trim()
                  })
                  .filter(cell => cell !== '')
                  .join(' | ')
                
                if (formattedRow) {
                  result += formattedRow + '\n'
                }
              }
            })
          }
          
          if (sheetIndex < workbook.SheetNames.length - 1) {
            result += '\n'
          }
        })
        
        resolve(result.trim())
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Check if file is CSV
 */
export function isCSV(filename: string): boolean {
  return getFileExtension(filename) === 'csv'
}

/**
 * Check if file is Excel
 */
export function isExcel(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ext === 'xlsx' || ext === 'xls'
}

