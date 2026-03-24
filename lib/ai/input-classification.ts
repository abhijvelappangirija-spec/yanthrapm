export type AiInputClassification = {
  sensitivity: 'standard' | 'restricted'
  requirePrivateProcessing: boolean
  reasons: string[]
}

type ClassificationRule = {
  reason: string
  pattern: RegExp
}

const RESTRICTED_RULES: ClassificationRule[] = [
  {
    reason: 'Contains credential or secret terminology',
    pattern:
      /\b(api[\s_-]?key|access[\s_-]?token|refresh[\s_-]?token|client[\s_-]?secret|private[\s_-]?key|secret key|password)\b/i,
  },
  {
    reason: 'Contains confidential or proprietary classification terms',
    pattern: /\b(confidential|strictly confidential|proprietary|internal only|do not share)\b/i,
  },
  {
    reason: 'Contains likely personally identifiable information',
    pattern:
      /\b(ssn|social security|passport number|tax id|aadhaar|date of birth|medical record)\b/i,
  },
  {
    reason: 'Contains direct contact or account identifier patterns',
    pattern:
      /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s().-]{8,}\d)/i,
  },
]

export function classifyAiInput(content: string): AiInputClassification {
  const normalizedContent = content.trim()

  if (!normalizedContent) {
    return {
      sensitivity: 'standard',
      requirePrivateProcessing: false,
      reasons: [],
    }
  }

  const reasons = RESTRICTED_RULES.filter((rule) => rule.pattern.test(normalizedContent)).map(
    (rule) => rule.reason
  )

  return {
    sensitivity: reasons.length > 0 ? 'restricted' : 'standard',
    requirePrivateProcessing: reasons.length > 0,
    reasons,
  }
}
