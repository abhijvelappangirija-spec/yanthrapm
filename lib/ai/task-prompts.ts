import { BrdEvidence } from '@/lib/ai/brd-evidence'
import { generateSprintPlanPrompt } from '@/lib/prompts/sprintPlan'

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }

  return `${content.slice(0, maxLength)}\n\n[... content truncated for analysis ...]`
}

function getBrdSourceTypeLabel(sourceType: 'input' | 'existing-brd'): string {
  return sourceType === 'existing-brd' ? 'existing BRD document' : 'raw project input'
}

export async function buildBRDEvidenceExtractionPrompt(input: {
  content: string
  sourceType: 'input' | 'existing-brd'
}): Promise<{
  systemPrompt: string
  userPrompt: string
}> {
  const contentToAnalyze = truncateContent(
    input.content,
    input.sourceType === 'existing-brd' ? 16000 : 24000
  )

  return {
    systemPrompt: `You are a principal business analyst and technical architect.

Extract structured BRD evidence from the provided ${getBrdSourceTypeLabel(input.sourceType)}.

Rules:
- Return valid JSON only.
- Do not include markdown, backticks, commentary, or HTML.
- Use only facts directly supported by the provided content.
- Do not invent integrations, compliance needs, metrics, personas, or scope.
- If something appears likely but is not explicitly supported, place it in assumptions or openQuestions instead of facts.
- Keep business language practical and implementation-oriented.
- Functional requirements must be actionable and specific enough for engineering planning.

Return this exact JSON shape:
{
  "projectName": "string",
  "problemStatement": "string",
  "productVision": "string",
  "stakeholders": ["string"],
  "userPersonas": ["string"],
  "businessObjectives": ["string"],
  "inScope": ["string"],
  "outOfScope": ["string"],
  "functionalRequirements": [
    {
      "id": "FR-1",
      "title": "string",
      "description": "string",
      "acceptanceCriteria": ["string"]
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-1",
      "category": "Security|Performance|Scalability|Availability|Usability|Compliance|Other",
      "requirement": "string",
      "metric": "string"
    }
  ],
  "integrations": ["string"],
  "dataRequirements": ["string"],
  "assumptions": ["string"],
  "constraints": ["string"],
  "dependencies": ["string"],
  "risks": ["string"],
  "successCriteria": ["string"],
  "openQuestions": ["string"]
}`,
    userPrompt: `Source type: ${getBrdSourceTypeLabel(input.sourceType)}

Analyze the following content and extract only supported evidence:

${contentToAnalyze}`,
  }
}

export async function buildBRDCompositionPrompt(
  evidence: BrdEvidence
): Promise<{
  systemPrompt: string
  userPrompt: string
}> {
  return {
    systemPrompt: `You are a principal business analyst writing an implementation-ready Business Requirements Document.

Use only the provided evidence JSON.

Rules:
- Output valid HTML only.
- Do not include markdown, backticks, or commentary.
- Start with <html> and end with </html>.
- Use semantic HTML headings and lists.
- Do not invent new facts, integrations, metrics, or commitments not present in the evidence.
- If evidence is incomplete, present it as an assumption, constraint, or open question instead of fabricating detail.
- The BRD must be practical enough for a technical manager or architect to review for delivery planning.

Required sections:
1. Executive Summary
2. Stakeholders and Personas
3. Business Objectives
4. Scope
5. Functional Requirements
6. Non-Functional Requirements
7. Integrations and Data Requirements
8. Dependencies and Risks
9. Assumptions and Constraints
10. Success Criteria
11. Open Questions`,
    userPrompt: `Generate the BRD strictly from this evidence JSON:

${JSON.stringify(evidence, null, 2)}`,
  }
}

export async function buildBRDPrompt(content: string): Promise<{
  systemPrompt: string
  userPrompt: string
}> {
  return {
    systemPrompt: `You are an expert business analyst. Generate a comprehensive Business Requirements Document (BRD) in STRICT HTML.

The BRD should include:
1. Executive Summary
2. Business Objectives
3. Functional Requirements (detailed)
4. Non-Functional Requirements (performance, security, scalability)
5. Assumptions and Constraints
6. Success Criteria

Requirements:
- Output MUST be valid HTML only.
- Do NOT include markdown, backticks, or any explanation.
- Start with <html> and end with </html>.
- Use semantic HTML: h1/h2 for headings, p for paragraphs, ul/li for lists.`,
    userPrompt: `
Generate a comprehensive BRD with sections:
1. Executive Summary
2. Business Objectives
3. Functional Requirements (detailed)
4. Non-Functional Requirements (performance, security, scalability)
5. Assumptions and Constraints
6. Success Criteria

Base it on this input:

${content}`,
  }
}

export async function buildBRDFromFilePrompt(fileContent: string): Promise<{
  systemPrompt: string
  userPrompt: string
}> {
  const maxContentLength = 8000
  const contentToAnalyze =
    fileContent.length > maxContentLength
      ? `${fileContent.substring(0, maxContentLength)}\n\n[... document continues - analyze the provided content comprehensively ...]`
      : fileContent

  return {
    systemPrompt: `You are an expert business analyst. Review and enhance an existing Business Requirements Document (BRD) to create a comprehensive, well-structured BRD in STRICT HTML format.

Your task:
1. Analyze the provided BRD document
2. Identify missing sections, gaps, or areas that need improvement
3. Enhance the content with additional details, clarity, and completeness
4. Ensure all standard BRD sections are present and well-documented
5. Maintain the original intent and requirements while improving structure and detail

The enhanced BRD should include:
1. Executive Summary (clear overview of the project)
2. Business Objectives (specific, measurable goals)
3. Functional Requirements (detailed user stories, features, workflows)
4. Non-Functional Requirements (performance, security, scalability, usability)
5. Assumptions and Constraints (technical, business, timeline constraints)
6. Success Criteria (measurable outcomes and KPIs)

Requirements:
- Output MUST be valid HTML only.
- Do NOT include markdown, backticks, or any explanation.
- Start with <html> and end with </html>.
- Use semantic HTML: h1/h2 for headings, p for paragraphs, ul/li for lists.
- Preserve all important information from the original document.
- Add missing details and improve clarity where needed.`,
    userPrompt: `Review and enhance the following BRD document. Analyze the provided document content and generate an improved, comprehensive Business Requirements Document.

Document Analysis Instructions:
1. Review the complete BRD document structure and all provided content
2. Preserve ALL original requirements, features, specifications, and details
3. Enhance sections that need more clarity or detail
4. Fill in any missing standard BRD sections (Executive Summary, Objectives, etc.)
5. Improve organization, structure, and professional presentation
6. Add implementation details where they would be helpful
7. Maintain the original intent and scope while improving completeness

BRD Document Content:
${contentToAnalyze}

Generate a comprehensive enhanced BRD that:
- Includes all information from the original document
- Is well-structured with proper sections
- Has improved clarity and detail
- Is ready for implementation planning`,
  }
}

export async function buildSprintPlanPromptInput(input: {
  brdText: string
  technicalContext?: string
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  velocity?: number
  resources?: Array<{
    name: string
    role: string
    tech_stack?: string
    capacity: number
  }>
}): Promise<{
  systemPrompt: string
  userPrompt: string
  calculatedVelocity: number
}> {
  let developerCapacity = 0

  if (input.resources && input.resources.length > 0) {
    input.resources.forEach((resource) => {
      const role = resource.role.toLowerCase()
      if (
        !role.includes('qa') &&
        !role.includes('test') &&
        !role.includes('quality') &&
        !role.includes('pm') &&
        !role.includes('project manager') &&
        !role.includes('manager') &&
        !role.includes('architect') &&
        !role.includes('architecture')
      ) {
        developerCapacity += resource.capacity * input.sprintDuration
      }
    })
  } else {
    developerCapacity =
      input.teamMembers * input.capacityPerMember * input.sprintDuration
  }

  const calculatedVelocity = input.velocity || Math.floor(developerCapacity / 8)
  const teamResources = input.resources?.map((resource) => ({
    name: resource.name,
    role: resource.role,
    tech_stack: resource.tech_stack,
    capacity: resource.capacity,
  }))

  return {
    systemPrompt: `You are an expert Agile coach and Scrum Master. Generate a detailed sprint plan based on a Business Requirements Document and Technical Context, with role-based task allocation.

Your response must be a valid JSON object with this exact structure:
{
  "storyGroups": [
    {
      "epic": "Epic Name",
      "stories": ["Story 1", "Story 2", ...],
      "storyPoints": number
    }
  ],
  "storiesCount": number,
  "suggestedStoryPoints": number,
  "sprintBreakdown": [
    {
      "sprint": number,
      "stories": ["Story 1", "Story 2", ...],
      "totalStoryPoints": number,
      "capacity": number,
      "qaTasks": ["QA Task 1", "QA Task 2", ...],
      "qaHours": number,
      "pmTasks": ["PM Task 1", "PM Task 2", ...],
      "pmHours": number,
      "architectTasks": ["Architect Task 1", "Architect Task 2", ...],
      "architectHours": number
    }
  ]
}

Rules:
- Use the BRD as the business requirement foundation
- Use the Technical Context section as the architectural constraint guide
- Do NOT propose designs or tech choices that contradict the provided Technical Context
- Break down the BRD into logical epics (story groups) based on both business needs and technical architecture
- Each epic should have multiple user stories
- Assign story points using Fibonacci sequence (1, 2, 3, 5, 8, 13, 21) - ONLY for development stories
- Distribute development stories across sprints based on developer velocity: ${calculatedVelocity} story points per sprint
- Ensure each sprint doesn't exceed the developer velocity capacity
- Create QA tasks (if QA team exists) for testing activities aligned with development stories
- Create PM tasks (if PM exists) for sprint management and coordination
- Create Architect tasks (if Architects exist) for design and technical guidance
- Estimate QA/PM/Architect tasks in hours, not story points
- Do NOT use QA/PM/Architect capacity for development story points
- Identify technical dependencies and sequencing based on the existing stack
- storiesCount should be the total number of development stories across all epics
- suggestedStoryPoints should be the sum of all development story points
- sprintBreakdown should distribute development stories across sprints respecting developer velocity limits
- Include role-specific tasks (qaTasks, pmTasks, architectTasks) in each sprint if those roles exist`,
    userPrompt: generateSprintPlanPrompt(
      input.brdText,
      input.technicalContext || '',
      input.teamMembers,
      input.capacityPerMember,
      input.sprintDuration,
      calculatedVelocity,
      teamResources
    ),
    calculatedVelocity,
  }
}
