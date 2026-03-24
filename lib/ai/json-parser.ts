export function extractJsonObject(response: string): string {
  let text = response.trim()

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch) {
    text = fencedMatch[1].trim()
  }

  try {
    JSON.parse(text)
    return text
  } catch {
    // Fall through to object extraction
  }

  const startIndex = text.indexOf('{')
  if (startIndex === -1) {
    throw new Error('No JSON object found in AI response')
  }

  let depth = 0
  let inString = false
  let isEscaped = false

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index]

    if (isEscaped) {
      isEscaped = false
      continue
    }

    if (char === '\\') {
      isEscaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1

      if (depth === 0) {
        return text.slice(startIndex, index + 1)
      }
    }
  }

  throw new Error('Incomplete JSON object in AI response')
}

export function parseJsonObject<T>(response: string): T {
  return JSON.parse(extractJsonObject(response)) as T
}
