/**
 * Perplexity AI API integration
 * Uses the Perplexity Chat Completions API
 */

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function callPerplexityAI(
  messages: PerplexityMessage[],
  model: string = 'sonar-pro'
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set in environment variables')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
  }

  const data: PerplexityResponse = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from Perplexity AI')
  }

  return data.choices[0].message.content
}

/**
 * Generate BRD using Perplexity AI
 */
export async function generateBRDWithPerplexity(content: string): Promise<string> {
  const systemPrompt = `You are an expert business analyst. Generate a comprehensive Business Requirements Document (BRD) in STRICT HTML. 
  

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
- Use semantic HTML: h1/h2 for headings, p for paragraphs, ul/li for lists.`

  const userPrompt = `
Generate a comprehensive BRD with sections:
1. Executive Summary
2. Business Objectives
3. Functional Requirements (detailed)
4. Non-Functional Requirements (performance, security, scalability)
5. Assumptions and Constraints
6. Success Criteria

Base it on this input:

${content}`

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  return await callPerplexityAI(messages)
}

/**
 * Generate improved BRD from an uploaded file using Perplexity AI
 * This function takes an existing BRD file and enhances/improves it
 */
export async function generateBRDFromFile(fileContent: string): Promise<string> {
  const systemPrompt = `You are an expert business analyst. Review and enhance an existing Business Requirements Document (BRD) to create a comprehensive, well-structured BRD in STRICT HTML format.

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
- Add missing details and improve clarity where needed.`

  // Include substantial portion of file content for analysis
  // Use up to 8000 characters to give Perplexity enough context while keeping prompt manageable
  const maxContentLength = 8000
  const contentToAnalyze = fileContent.length > maxContentLength 
    ? fileContent.substring(0, maxContentLength) + '\n\n[... document continues - analyze the provided content comprehensively ...]'
    : fileContent

  const userPrompt = `Review and enhance the following BRD document. Analyze the provided document content and generate an improved, comprehensive Business Requirements Document.

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
- Is ready for implementation planning`

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  return await callPerplexityAI(messages)
}

/**
 * Generate Sprint Plan using Perplexity AI with Technical Context and Role-Based Planning
 */
export async function generateSprintPlanWithPerplexity(
  brdText: string,
  technicalContext: string = '',
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number,
  resources?: Array<{
    name: string
    role: string
    tech_stack?: string
    capacity: number
  }>
): Promise<{
  storyGroups: Array<{
    epic: string
    stories: string[]
    storyPoints: number
  }>
  storiesCount: number
  suggestedStoryPoints: number
  sprintBreakdown: Array<{
    sprint: number
    stories: string[]
    totalStoryPoints: number
    capacity: number
    qaTasks?: string[]
    qaHours?: number
    pmTasks?: string[]
    pmHours?: number
    architectTasks?: string[]
    architectHours?: number
  }>
}> {
  // Calculate developer capacity for velocity calculation
  let developerCapacity = 0
  if (resources && resources.length > 0) {
    resources.forEach((resource) => {
      const role = resource.role.toLowerCase()
      if (!role.includes('qa') && !role.includes('test') && !role.includes('quality') &&
          !role.includes('pm') && !role.includes('project manager') && !role.includes('manager') &&
          !role.includes('architect') && !role.includes('architecture')) {
        developerCapacity += resource.capacity * sprintDuration
      }
    })
  } else {
    developerCapacity = teamMembers * capacityPerMember * sprintDuration
  }

  const calculatedVelocity = velocity || Math.floor(developerCapacity / 8)

  // Import and use the prompt generator
  const { generateSprintPlanPrompt } = await import('@/lib/prompts/sprintPlan')
  type TeamResource = {
    name: string
    role: string
    tech_stack?: string
    capacity: number
  }
  const teamResources: TeamResource[] | undefined = resources?.map((r) => ({
    name: r.name,
    role: r.role,
    tech_stack: r.tech_stack,
    capacity: r.capacity,
  }))
  
  const userPrompt = generateSprintPlanPrompt(
    brdText,
    technicalContext,
    teamMembers,
    capacityPerMember,
    sprintDuration,
    calculatedVelocity,
    teamResources
  )

  const systemPrompt = `You are an expert Agile coach and Scrum Master. Generate a detailed sprint plan based on a Business Requirements Document and Technical Context, with role-based task allocation.

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
- DO NOT use QA/PM/Architect capacity for development story points
- Identify technical dependencies and sequencing based on the existing stack
- storiesCount should be the total number of development stories across all epics
- suggestedStoryPoints should be the sum of all development story points
- sprintBreakdown should distribute development stories across sprints respecting developer velocity limits
- Include role-specific tasks (qaTasks, pmTasks, architectTasks) in each sprint if those roles exist`

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  const response = await callPerplexityAI(messages, 'sonar-pro')

  // Extract JSON from response (handle cases where AI adds extra text)
  let jsonString = response.trim()
  
  // Try to extract JSON if wrapped in markdown code blocks
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonString = jsonMatch[1]
  }

  // Try to find JSON object in the response
  const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    jsonString = jsonObjectMatch[0]
  }

  try {
    const sprintPlan = JSON.parse(jsonString)
    
    // Validate and ensure all required fields exist
    if (!sprintPlan.storyGroups || !Array.isArray(sprintPlan.storyGroups)) {
      throw new Error('Invalid response: storyGroups is missing or not an array')
    }

    if (!sprintPlan.sprintBreakdown || !Array.isArray(sprintPlan.sprintBreakdown)) {
      throw new Error('Invalid response: sprintBreakdown is missing or not an array')
    }

    // Calculate derived values if not provided
    if (!sprintPlan.storiesCount) {
      sprintPlan.storiesCount = sprintPlan.storyGroups.reduce(
        (sum: number, group: any) => sum + (group.stories?.length || 0),
        0
      )
    }

    if (!sprintPlan.suggestedStoryPoints) {
      sprintPlan.suggestedStoryPoints = sprintPlan.storyGroups.reduce(
        (sum: number, group: any) => sum + (group.storyPoints || 0),
        0
      )
    }

    return sprintPlan
  } catch (error) {
    console.error('Error parsing Perplexity response:', error)
    console.error('Response received:', response)
    throw new Error(`Failed to parse sprint plan from Perplexity AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}



