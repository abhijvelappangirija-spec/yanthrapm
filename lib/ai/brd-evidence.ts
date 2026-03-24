import { parseJsonObject } from '@/lib/ai/json-parser'

export type BrdFunctionalRequirement = {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
}

export type BrdNonFunctionalRequirement = {
  id: string
  category: string
  requirement: string
  metric?: string
}

export type BrdEvidence = {
  projectName: string
  problemStatement: string
  productVision: string
  stakeholders: string[]
  userPersonas: string[]
  businessObjectives: string[]
  inScope: string[]
  outOfScope: string[]
  functionalRequirements: BrdFunctionalRequirement[]
  nonFunctionalRequirements: BrdNonFunctionalRequirement[]
  integrations: string[]
  dataRequirements: string[]
  assumptions: string[]
  constraints: string[]
  dependencies: string[]
  risks: string[]
  successCriteria: string[]
  openQuestions: string[]
}

function normalizeText(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

function normalizeFunctionalRequirements(value: unknown): BrdFunctionalRequirement[] {
  if (!Array.isArray(value)) {
    return []
  }

  const requirements: BrdFunctionalRequirement[] = []

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return
    }

    const payload = item as Record<string, unknown>
    const title = normalizeText(payload.title)
    const description = normalizeText(payload.description)

    if (!title || !description) {
      return
    }

    requirements.push({
      id: normalizeText(payload.id, `FR-${index + 1}`),
      title,
      description,
      acceptanceCriteria: normalizeStringArray(payload.acceptanceCriteria),
    })
  })

  return requirements
}

function normalizeNonFunctionalRequirements(value: unknown): BrdNonFunctionalRequirement[] {
  if (!Array.isArray(value)) {
    return []
  }

  const requirements: BrdNonFunctionalRequirement[] = []

  value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return
    }

    const payload = item as Record<string, unknown>
    const category = normalizeText(payload.category)
    const requirement = normalizeText(payload.requirement)

    if (!category || !requirement) {
      return
    }

    requirements.push({
      id: normalizeText(payload.id, `NFR-${index + 1}`),
      category,
      requirement,
      metric: normalizeText(payload.metric),
    })
  })

  return requirements
}

export function parseBrdEvidenceResponse(response: string): BrdEvidence {
  const raw = parseJsonObject<Record<string, unknown>>(response)

  return {
    projectName: normalizeText(raw.projectName, 'Untitled Initiative'),
    problemStatement: normalizeText(
      raw.problemStatement,
      'The business problem needs further clarification from stakeholders.'
    ),
    productVision: normalizeText(
      raw.productVision,
      'A clear product vision still needs stakeholder confirmation.'
    ),
    stakeholders: normalizeStringArray(raw.stakeholders),
    userPersonas: normalizeStringArray(raw.userPersonas),
    businessObjectives: normalizeStringArray(raw.businessObjectives),
    inScope: normalizeStringArray(raw.inScope),
    outOfScope: normalizeStringArray(raw.outOfScope),
    functionalRequirements: normalizeFunctionalRequirements(raw.functionalRequirements),
    nonFunctionalRequirements: normalizeNonFunctionalRequirements(
      raw.nonFunctionalRequirements
    ),
    integrations: normalizeStringArray(raw.integrations),
    dataRequirements: normalizeStringArray(raw.dataRequirements),
    assumptions: normalizeStringArray(raw.assumptions),
    constraints: normalizeStringArray(raw.constraints),
    dependencies: normalizeStringArray(raw.dependencies),
    risks: normalizeStringArray(raw.risks),
    successCriteria: normalizeStringArray(raw.successCriteria),
    openQuestions: normalizeStringArray(raw.openQuestions),
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderList(items: string[], emptyMessage: string): string {
  if (items.length === 0) {
    return `<p>${escapeHtml(emptyMessage)}</p>`
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`
}

export function renderBrdHtmlFromEvidence(evidence: BrdEvidence): string {
  const functionalRequirementsHtml =
    evidence.functionalRequirements.length > 0
      ? evidence.functionalRequirements
          .map(
            (requirement) => `
              <article>
                <h3>${escapeHtml(requirement.id)}: ${escapeHtml(requirement.title)}</h3>
                <p>${escapeHtml(requirement.description)}</p>
                <h4>Acceptance Criteria</h4>
                ${renderList(
                  requirement.acceptanceCriteria,
                  'Acceptance criteria require stakeholder confirmation.'
                )}
              </article>
            `
          )
          .join('')
      : '<p>Functional requirements require stakeholder confirmation.</p>'

  const nonFunctionalRequirementsHtml =
    evidence.nonFunctionalRequirements.length > 0
      ? evidence.nonFunctionalRequirements
          .map(
            (requirement) => `
              <article>
                <h3>${escapeHtml(requirement.id)}: ${escapeHtml(requirement.category)}</h3>
                <p>${escapeHtml(requirement.requirement)}</p>
                ${
                  requirement.metric
                    ? `<p><strong>Metric:</strong> ${escapeHtml(requirement.metric)}</p>`
                    : ''
                }
              </article>
            `
          )
          .join('')
      : '<p>Non-functional requirements require stakeholder confirmation.</p>'

  return `
    <html>
      <body>
        <h1>Business Requirements Document</h1>
        <h2>${escapeHtml(evidence.projectName)}</h2>

        <section>
          <h2>Executive Summary</h2>
          <p>${escapeHtml(evidence.problemStatement)}</p>
          <p>${escapeHtml(evidence.productVision)}</p>
        </section>

        <section>
          <h2>Stakeholders and Personas</h2>
          <h3>Stakeholders</h3>
          ${renderList(
            evidence.stakeholders,
            'Stakeholders have not been fully identified.'
          )}
          <h3>User Personas</h3>
          ${renderList(evidence.userPersonas, 'User personas need confirmation.')}
        </section>

        <section>
          <h2>Business Objectives</h2>
          ${renderList(
            evidence.businessObjectives,
            'Business objectives require stakeholder confirmation.'
          )}
        </section>

        <section>
          <h2>Scope</h2>
          <h3>In Scope</h3>
          ${renderList(evidence.inScope, 'In-scope items are not clearly defined yet.')}
          <h3>Out of Scope</h3>
          ${renderList(
            evidence.outOfScope,
            'Out-of-scope items require explicit stakeholder agreement.'
          )}
        </section>

        <section>
          <h2>Functional Requirements</h2>
          ${functionalRequirementsHtml}
        </section>

        <section>
          <h2>Non-Functional Requirements</h2>
          ${nonFunctionalRequirementsHtml}
        </section>

        <section>
          <h2>Integrations and Data Requirements</h2>
          <h3>Integrations</h3>
          ${renderList(evidence.integrations, 'No confirmed integrations were identified.')}
          <h3>Data Requirements</h3>
          ${renderList(
            evidence.dataRequirements,
            'Data requirements require stakeholder and architecture confirmation.'
          )}
        </section>

        <section>
          <h2>Dependencies and Risks</h2>
          <h3>Dependencies</h3>
          ${renderList(
            evidence.dependencies,
            'Dependencies have not been fully documented.'
          )}
          <h3>Risks</h3>
          ${renderList(evidence.risks, 'No explicit risks were identified in the input.')}
        </section>

        <section>
          <h2>Assumptions and Constraints</h2>
          <h3>Assumptions</h3>
          ${renderList(evidence.assumptions, 'No explicit assumptions were provided.')}
          <h3>Constraints</h3>
          ${renderList(
            evidence.constraints,
            'Constraints require clarification from delivery and architecture teams.'
          )}
        </section>

        <section>
          <h2>Success Criteria</h2>
          ${renderList(
            evidence.successCriteria,
            'Success criteria require measurable stakeholder agreement.'
          )}
        </section>

        <section>
          <h2>Open Questions</h2>
          ${renderList(
            evidence.openQuestions,
            'No open questions were captured, but validation with stakeholders is still recommended.'
          )}
        </section>
      </body>
    </html>
  `
    .replace(/\n\s+/g, '')
    .trim()
}

export function buildDummyBrdEvidence(
  content: string,
  sourceType: 'input' | 'existing-brd'
): BrdEvidence {
  const normalizedContent = content.trim()
  const firstLine = normalizedContent.split('\n').find((line) => line.trim())?.trim()
  const summary =
    normalizedContent.slice(0, 400) ||
    'The provided input did not contain enough detail to describe the initiative.'

  return {
    projectName: firstLine || 'Untitled Initiative',
    problemStatement: summary,
    productVision:
      sourceType === 'existing-brd'
        ? 'The uploaded BRD should be refined into an implementation-ready document.'
        : 'The initiative should be turned into a practical, implementation-ready product definition.',
    stakeholders: ['Business sponsor', 'Product owner', 'Engineering lead'],
    userPersonas: ['Primary end user', 'Operations or support user'],
    businessObjectives: [
      'Clarify the business problem and target outcomes.',
      'Define a scope that is implementable by engineering teams.',
    ],
    inScope: ['Core workflows explicitly described in the input.'],
    outOfScope: ['Any requirement not supported by the provided input.'],
    functionalRequirements: [
      {
        id: 'FR-1',
        title: 'Capture the core workflow',
        description: 'Document the main user journey and expected business outcome.',
        acceptanceCriteria: [
          'Primary workflow steps are documented.',
          'Business outcome for the workflow is clear.',
        ],
      },
      {
        id: 'FR-2',
        title: 'Support implementation planning',
        description:
          'Provide enough detail for engineering and delivery teams to estimate and plan execution.',
        acceptanceCriteria: [
          'Requirements are clear enough for sprint planning.',
          'Dependencies and risks are visible to the delivery team.',
        ],
      },
    ],
    nonFunctionalRequirements: [
      {
        id: 'NFR-1',
        category: 'Security',
        requirement: 'Sensitive data handling must be validated before release.',
      },
      {
        id: 'NFR-2',
        category: 'Scalability',
        requirement: 'The solution should support projected growth without major redesign.',
      },
    ],
    integrations: ['Integration needs require confirmation from stakeholders.'],
    dataRequirements: ['Key data entities and retention needs require confirmation.'],
    assumptions: ['The provided input reflects the current business intent.'],
    constraints: ['Technical and timeline constraints require stakeholder confirmation.'],
    dependencies: ['Delivery planning depends on clarifying missing requirements.'],
    risks: ['Incomplete requirements could delay implementation planning.'],
    successCriteria: [
      'Stakeholders approve the BRD as implementation-ready.',
      'Engineering can derive sprint-ready stories from the BRD.',
    ],
    openQuestions: [
      'Which workflows are mandatory for the first release?',
      'What compliance, integration, or reporting constraints apply?',
    ],
  }
}
