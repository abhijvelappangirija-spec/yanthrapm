import { BrdEvidence, renderBrdHtmlFromEvidence } from '@/lib/ai/brd-evidence'

const REQUIRED_SECTION_TITLES = [
  'Executive Summary',
  'Stakeholders and Personas',
  'Business Objectives',
  'Scope',
  'Functional Requirements',
  'Non-Functional Requirements',
  'Integrations and Data Requirements',
  'Dependencies and Risks',
  'Assumptions and Constraints',
  'Success Criteria',
  'Open Questions',
] as const

export type BrdValidationResult = {
  score: number
  missingSections: string[]
  missingEvidenceReferences: string[]
  unsupportedClaims: Array<{
    section: string
    claim: string
    reason: string
  }>
  repaired: boolean
}

const SECTION_EVIDENCE_KEYS: Record<string, (keyof BrdEvidence)[]> = {
  'Executive Summary': ['problemStatement', 'productVision'],
  'Stakeholders and Personas': ['stakeholders', 'userPersonas'],
  'Business Objectives': ['businessObjectives'],
  Scope: ['inScope', 'outOfScope'],
  'Functional Requirements': ['functionalRequirements'],
  'Non-Functional Requirements': ['nonFunctionalRequirements'],
  'Integrations and Data Requirements': ['integrations', 'dataRequirements'],
  'Dependencies and Risks': ['dependencies', 'risks'],
  'Assumptions and Constraints': ['assumptions', 'constraints'],
  'Success Criteria': ['successCriteria'],
  'Open Questions': ['openQuestions'],
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
  'within',
])

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonicalizeBrdSectionTitle(raw: string): string {
  const cleaned = stripHtml(raw).replace(/\s+/g, ' ').trim()
  const canonical = REQUIRED_SECTION_TITLES.find(
    (title) => title.toLowerCase() === cleaned.toLowerCase()
  )
  return canonical ?? cleaned
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^a-z0-9%.\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle))
}

function collectEvidenceChecks(evidence: BrdEvidence): string[] {
  const checks: string[] = []

  evidence.businessObjectives.slice(0, 2).forEach((value) => checks.push(value))
  evidence.inScope.slice(0, 2).forEach((value) => checks.push(value))
  evidence.functionalRequirements
    .slice(0, 3)
    .forEach((requirement) => checks.push(requirement.title))
  evidence.nonFunctionalRequirements
    .slice(0, 2)
    .forEach((requirement) => checks.push(requirement.category))
  evidence.successCriteria.slice(0, 2).forEach((value) => checks.push(value))

  return checks.filter(Boolean)
}

function flattenEvidenceEntries(value: BrdEvidence[keyof BrdEvidence]): string[] {
  if (typeof value === 'string') {
    return value ? [value] : []
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return item ? [item] : []
    }

    if (!item || typeof item !== 'object') {
      return []
    }

    return Object.values(item).flatMap((nestedValue) => {
      if (typeof nestedValue === 'string') {
        return nestedValue ? [nestedValue] : []
      }

      if (Array.isArray(nestedValue)) {
        return nestedValue.filter(
          (entry): entry is string => typeof entry === 'string' && Boolean(entry.trim())
        )
      }

      return []
    })
  })
}

function buildEvidenceBySection(evidence: BrdEvidence): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(SECTION_EVIDENCE_KEYS).map(([sectionTitle, keys]) => [
      sectionTitle,
      keys.flatMap((key) => flattenEvidenceEntries(evidence[key])),
    ])
  )
}

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/\s+/)
        .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    )
  )
}

function extractNumericTokens(value: string): string[] {
  return Array.from(
    new Set(
      (normalizeText(value).match(/\b\d+(?:\.\d+)?%?(?:x)?\b/g) || []).filter(Boolean)
    )
  )
}

function extractSectionBlocks(html: string): Array<{ title: string; html: string }> {
  const headingPattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
  const headings: Array<{ title: string; index: number; length: number }> = []

  let match: RegExpExecArray | null

  while ((match = headingPattern.exec(html)) !== null) {
    headings.push({
      title: stripHtml(match[1]),
      index: match.index,
      length: match[0].length,
    })
  }

  return headings.map((heading, index) => {
    const start = heading.index + heading.length
    const end = index + 1 < headings.length ? headings[index + 1].index : html.length

    return {
      title: canonicalizeBrdSectionTitle(heading.title),
      html: html.slice(start, end),
    }
  })
}

function extractClaims(sectionHtml: string): string[] {
  const claims = [
    ...Array.from(sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi), (match) =>
      stripHtml(match[1])
    ),
    ...Array.from(sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi), (match) =>
      stripHtml(match[1])
    ),
    ...Array.from(sectionHtml.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi), (match) =>
      stripHtml(match[1])
    ),
  ]
    .map((claim) => claim.trim())
    .filter((claim) => claim.length >= 8)

  return Array.from(new Set(claims))
}

function isSafeQualifiedClaim(claim: string): boolean {
  const normalized = normalizeText(claim)

  return [
    'requires confirmation',
    'needs confirmation',
    'require confirmation',
    'needs clarification',
    'require clarification',
    'to be confirmed',
    'not explicitly',
    'not captured',
    'not identified',
    'requires stakeholder',
    'pending stakeholder',
    'open question',
    'recommended',
  ].some((pattern) => normalized.includes(pattern))
}

function hasStrongTokenOverlap(claim: string, evidenceEntry: string): boolean {
  const claimTokens = tokenize(claim)
  const evidenceTokens = tokenize(evidenceEntry)

  if (claimTokens.length === 0 || evidenceTokens.length === 0) {
    return false
  }

  const overlap = claimTokens.filter((token) => evidenceTokens.includes(token)).length

  return (
    overlap / claimTokens.length >= 0.5 ||
    overlap / evidenceTokens.length >= 0.45 ||
    overlap >= Math.min(3, claimTokens.length)
  )
}

function isClaimSupportedByEvidence(
  claim: string,
  sectionEvidence: string[],
  allEvidenceEntries: string[]
): { supported: boolean; reason?: string } {
  const normalizedClaim = normalizeText(claim)

  if (!normalizedClaim || isSafeQualifiedClaim(claim)) {
    return { supported: true }
  }

  const claimNumbers = extractNumericTokens(claim)
  const candidateEvidence = sectionEvidence.length > 0 ? sectionEvidence : allEvidenceEntries

  if (candidateEvidence.length === 0) {
    return {
      supported: false,
      reason: 'No supporting evidence exists for this section',
    }
  }

  const exactMatch = candidateEvidence.some((entry) => {
    const normalizedEntry = normalizeText(entry)
    return normalizedEntry.includes(normalizedClaim) || normalizedClaim.includes(normalizedEntry)
  })

  if (exactMatch) {
    return { supported: true }
  }

  const overlapMatch = candidateEvidence.some((entry) => hasStrongTokenOverlap(claim, entry))

  if (overlapMatch) {
    const numbersSupported =
      claimNumbers.length === 0 ||
      candidateEvidence.some((entry) => {
        const entryNumbers = extractNumericTokens(entry)
        return claimNumbers.every((token) => entryNumbers.includes(token))
      })

    if (!numbersSupported) {
      return {
        supported: false,
        reason: 'Introduces numeric or measurable details not present in the evidence',
      }
    }

    return { supported: true }
  }

  return {
    supported: false,
    reason:
      sectionEvidence.length > 0
        ? 'Claim is not sufficiently grounded in the section evidence'
        : 'Claim is not supported by any extracted evidence',
  }
}

function collectUnsupportedClaims(
  html: string,
  evidence: BrdEvidence
): BrdValidationResult['unsupportedClaims'] {
  const evidenceBySection = buildEvidenceBySection(evidence)
  const allEvidenceEntries = Object.values(evidenceBySection).flat()
  const unsupportedClaims: BrdValidationResult['unsupportedClaims'] = []

  extractSectionBlocks(html).forEach((section) => {
    const sectionEvidence = evidenceBySection[section.title] || []

    extractClaims(section.html).forEach((claim) => {
      const supportCheck = isClaimSupportedByEvidence(
        claim,
        sectionEvidence,
        allEvidenceEntries
      )

      if (supportCheck.supported) {
        return
      }

      unsupportedClaims.push({
        section: section.title,
        claim,
        reason: supportCheck.reason || 'Claim is not supported by the extracted evidence',
      })
    })
  })

  return unsupportedClaims.filter(
    (claim, index, claims) =>
      claims.findIndex(
        (candidate) =>
          candidate.section === claim.section && candidate.claim === claim.claim
      ) === index
  )
}

export function validateBrdHtml(
  html: string,
  evidence: BrdEvidence
): Omit<BrdValidationResult, 'repaired'> {
  const normalizedHtml = html
  const normalizedText = stripHtml(html).toLowerCase()

  const missingSections = REQUIRED_SECTION_TITLES.filter(
    (sectionTitle) => !includesNormalized(normalizedHtml, sectionTitle)
  )

  const missingEvidenceReferences = collectEvidenceChecks(evidence).filter(
    (value) => !includesNormalized(normalizedText, value)
  )
  const unsupportedClaims = collectUnsupportedClaims(html, evidence)
  const unsupportedClaimPenalty = unsupportedClaims.reduce((total, claim) => {
    if (claim.reason.includes('numeric or measurable')) {
      return total + 10
    }

    if (claim.reason.includes('No supporting evidence')) {
      return total + 8
    }

    return total + 6
  }, 0)

  const score = Math.max(
    0,
    100 -
      missingSections.length * 12 -
      missingEvidenceReferences.length * 4 -
      unsupportedClaimPenalty
  )

  return {
    score,
    missingSections,
    missingEvidenceReferences,
    unsupportedClaims,
  }
}

export function finalizeBrdHtml(
  html: string,
  evidence: BrdEvidence
): {
  html: string
  validation: BrdValidationResult
} {
  const validation = validateBrdHtml(html, evidence)
  const hasCriticalUnsupportedClaims = validation.unsupportedClaims.some(
    (claim) =>
      claim.reason.includes('numeric or measurable') ||
      claim.reason.includes('No supporting evidence')
  )

  const keepStrict =
    validation.missingSections.length === 0 &&
    validation.score >= 84 &&
    !hasCriticalUnsupportedClaims &&
    validation.unsupportedClaims.length <= 1

  const keepLenient =
    validation.missingSections.length === 0 &&
    !hasCriticalUnsupportedClaims &&
    validation.score >= 72 &&
    validation.unsupportedClaims.length <= 5 &&
    validation.missingEvidenceReferences.length <= 5

  if (keepStrict || keepLenient) {
    return {
      html,
      validation: {
        ...validation,
        repaired: false,
      },
    }
  }

  return {
    html: renderBrdHtmlFromEvidence(evidence),
    validation: {
      ...validation,
      repaired: true,
    },
  }
}
