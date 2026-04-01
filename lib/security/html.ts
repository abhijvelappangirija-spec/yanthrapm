const DANGEROUS_BLOCK_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'noscript',
  'meta',
  'link',
]

const ALLOWED_SIMPLE_TAGS = [
  'p',
  'div',
  'span',
  'section',
  'article',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'blockquote',
  'pre',
  'code',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]

const ALLOWED_VOID_TAGS = ['br', 'hr']

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripMarkdownCodeFences(input: string): string {
  return input
    .replace(/^\s*```(?:[a-z0-9_-]+)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/^\s*```(?:[a-z0-9_-]+)?\s*$/gim, '')
    .trim()
}

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = String(entity).toLowerCase()

    if (normalized in HTML_ENTITY_MAP) {
      return HTML_ENTITY_MAP[normalized]
    }

    if (normalized === '#39') {
      return "'"
    }

    if (normalized === '#34') {
      return '"'
    }

    if (normalized === '#38') {
      return '&'
    }

    if (normalized === '#60') {
      return '<'
    }

    if (normalized === '#62') {
      return '>'
    }

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16)
      if (!Number.isNaN(codePoint)) {
        return String.fromCodePoint(codePoint)
      }
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10)
      if (!Number.isNaN(codePoint)) {
        return String.fromCodePoint(codePoint)
      }
    }

    return match
  })
}

function decodeHtmlEntitiesRepeatedly(input: string, maxPasses: number = 3): string {
  let current = input

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const decoded = decodeHtmlEntities(current)
    if (decoded === current) {
      break
    }
    current = decoded
  }

  return current
}

function extractDocumentBody(input: string): string {
  let content = input
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)

  if (bodyMatch) {
    return bodyMatch[1].trim()
  }

  const htmlMatch = content.match(/<html[^>]*>([\s\S]*?)<\/html>/i)
  if (htmlMatch) {
    content = htmlMatch[1]
  }

  content = content
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<\/?(?:html|body)\b[^>]*>/gi, '')

  return content.trim()
}

export function normalizeGeneratedHtml(input: string): string {
  if (!input || !input.trim()) {
    return ''
  }

  let content = stripMarkdownCodeFences(input.trim())
  content = decodeHtmlEntitiesRepeatedly(content)
  content = content
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?(?:xml|php)[\s\S]*?\?>/gi, '')

  return extractDocumentBody(content)
}

function preserveAllowedTags(input: string): { content: string; placeholders: string[] } {
  const placeholders: string[] = []
  let content = input

  const storePlaceholder = (tag: string): string => {
    const index = placeholders.push(tag) - 1
    return `__SAFE_HTML_${index}__`
  }

  const simpleTagPattern = new RegExp(
    `<\\/?(?:${ALLOWED_SIMPLE_TAGS.join('|')})\\b[^>]*>`,
    'gi'
  )

  const voidTagPattern = new RegExp(
    `<(?:${ALLOWED_VOID_TAGS.join('|')})\\b[^>]*\\/?>`,
    'gi'
  )

  content = content.replace(simpleTagPattern, (match) => {
    const normalized = match.match(/^<\s*\/\s*([a-z0-9]+)\b/i)
    if (normalized) {
      return storePlaceholder(`</${normalized[1].toLowerCase()}>`)
    }

    const opening = match.match(/^<\s*([a-z0-9]+)\b/i)
    if (!opening) {
      return ''
    }

    return storePlaceholder(`<${opening[1].toLowerCase()}>`)
  })

  content = content.replace(voidTagPattern, (match) => {
    const opening = match.match(/^<\s*([a-z0-9]+)\b/i)
    if (!opening) {
      return ''
    }

    return storePlaceholder(`<${opening[1].toLowerCase()}>`)
  })

  return { content, placeholders }
}

export function sanitizeRichTextHtml(input: string): string {
  if (!input || !input.trim()) {
    return ''
  }

  let content = input

  content = content
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?(?:xml|php)[\s\S]*?\?>/gi, '')

  for (const tag of DANGEROUS_BLOCK_TAGS) {
    const pairPattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi')
    const singlePattern = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi')
    content = content.replace(pairPattern, '')
    content = content.replace(singlePattern, '')
  }

  const { content: protectedContent, placeholders } = preserveAllowedTags(content)
  const escaped = escapeHtml(protectedContent)

  return placeholders.reduce((safeHtml, placeholder, index) => {
    return safeHtml.replace(`__SAFE_HTML_${index}__`, placeholder)
  }, escaped)
}

export function sanitizeGeneratedHtml(input: string): string {
  return sanitizeRichTextHtml(normalizeGeneratedHtml(input))
}
