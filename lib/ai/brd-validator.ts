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
  repaired: boolean
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesNormalized(haystack: string, needle: string): boolean {
  return haystack.includes(needle.trim().toLowerCase())
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

export function validateBrdHtml(
  html: string,
  evidence: BrdEvidence
): Omit<BrdValidationResult, 'repaired'> {
  const normalizedHtml = html.toLowerCase()
  const normalizedText = stripHtml(html).toLowerCase()

  const missingSections = REQUIRED_SECTION_TITLES.filter(
    (sectionTitle) => !includesNormalized(normalizedHtml, sectionTitle)
  )

  const missingEvidenceReferences = collectEvidenceChecks(evidence).filter(
    (value) => !includesNormalized(normalizedText, value)
  )

  const score = Math.max(
    0,
    100 - missingSections.length * 12 - missingEvidenceReferences.length * 4
  )

  return {
    score,
    missingSections,
    missingEvidenceReferences,
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

  if (validation.missingSections.length === 0 && validation.score >= 80) {
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
