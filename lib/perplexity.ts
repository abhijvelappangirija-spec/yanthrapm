/**
 * Perplexity AI API integration
 * Uses the Perplexity Chat Completions API
 */

/**
 * Generate a dummy/mock BRD response for testing
 */
export function generateDummyBRD(content: string): string {
  // Return only body content (no html/head/body tags) for proper rendering
  return `<h1>Business Requirements Document</h1>
  
  <h2>Executive Summary</h2>
  <p>This is a dummy BRD generated for testing purposes. The system will generate a comprehensive Business Requirements Document based on the input provided: "${content.substring(0, 100)}..."</p>
  
  <h2>Business Objectives</h2>
  <ul>
    <li>Improve operational efficiency</li>
    <li>Enhance user experience</li>
    <li>Reduce manual processes</li>
    <li>Increase system scalability</li>
  </ul>
  
  <h2>Functional Requirements</h2>
  <h3>FR-1: Core Functionality</h3>
  <p>The system shall provide core functionality as specified in the requirements.</p>
  <ul>
    <li>User authentication and authorization</li>
    <li>Data management and storage</li>
    <li>Reporting and analytics</li>
  </ul>
  
  <h3>FR-2: User Interface</h3>
  <p>The system shall provide an intuitive user interface.</p>
  <ul>
    <li>Responsive design for multiple devices</li>
    <li>Accessible interface following WCAG guidelines</li>
    <li>Multi-language support</li>
  </ul>
  
  <h2>Non-Functional Requirements</h2>
  <h3>Performance</h3>
  <ul>
    <li>System response time should be less than 2 seconds</li>
    <li>Support for concurrent users up to 1000</li>
  </ul>
  
  <h3>Security</h3>
  <ul>
    <li>Data encryption in transit and at rest</li>
    <li>Regular security audits</li>
    <li>Compliance with data protection regulations</li>
  </ul>
  
  <h3>Scalability</h3>
  <ul>
    <li>Horizontal scaling capability</li>
    <li>Support for future growth</li>
  </ul>
  
  <h2>Assumptions and Constraints</h2>
  <ul>
    <li>Stable internet connectivity required</li>
    <li>Modern web browsers supported</li>
    <li>Budget constraints as per project allocation</li>
  </ul>
  
  <h2>Success Criteria</h2>
  <ul>
    <li>All functional requirements implemented and tested</li>
    <li>Performance benchmarks met</li>
    <li>User acceptance testing passed</li>
    <li>System deployed to production successfully</li>
  </ul>`
}

/**
 * Generate a dummy/mock Sprint Plan response for testing
 */
export function generateDummySprintPlan(
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number
): {
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
  }>
} {
  const calculatedVelocity = velocity || Math.floor((teamMembers * capacityPerMember * sprintDuration) / 8)
  
  const storyGroups = [
    {
      epic: 'User Authentication & Authorization',
      stories: [
        'As a user, I want to register with email and password',
        'As a user, I want to login securely',
        'As a user, I want to reset my password',
        'As an admin, I want to manage user roles',
      ],
      storyPoints: 13,
    },
    {
      epic: 'Core Data Management',
      stories: [
        'As a user, I want to create new records',
        'As a user, I want to view all my records',
        'As a user, I want to edit existing records',
        'As a user, I want to delete records',
        'As a user, I want to search and filter records',
      ],
      storyPoints: 21,
    },
    {
      epic: 'Reporting & Analytics',
      stories: [
        'As a user, I want to view dashboard with key metrics',
        'As a user, I want to generate custom reports',
        'As a user, I want to export reports to PDF',
        'As a user, I want to schedule automated reports',
      ],
      storyPoints: 13,
    },
    {
      epic: 'User Interface & Experience',
      stories: [
        'As a user, I want a responsive mobile interface',
        'As a user, I want intuitive navigation',
        'As a user, I want accessible design features',
        'As a user, I want multi-language support',
      ],
      storyPoints: 8,
    },
  ]
  
  const storiesCount = storyGroups.reduce((sum, group) => sum + group.stories.length, 0)
  const suggestedStoryPoints = storyGroups.reduce((sum, group) => sum + group.storyPoints, 0)
  
  // Distribute stories across sprints
  const sprintBreakdown: Array<{
    sprint: number
    stories: string[]
    totalStoryPoints: number
    capacity: number
  }> = []
  
  let currentSprint = 1
  let currentSprintPoints = 0
  let currentSprintStories: string[] = []
  
  for (const group of storyGroups) {
    for (const story of group.stories) {
      const storyPoints = Math.floor(group.storyPoints / group.stories.length) || 3
      
      if (currentSprintPoints + storyPoints > calculatedVelocity && currentSprintStories.length > 0) {
        // Start new sprint
        sprintBreakdown.push({
          sprint: currentSprint,
          stories: [...currentSprintStories],
          totalStoryPoints: currentSprintPoints,
          capacity: calculatedVelocity,
        })
        currentSprint++
        currentSprintPoints = storyPoints
        currentSprintStories = [story]
      } else {
        currentSprintPoints += storyPoints
        currentSprintStories.push(story)
      }
    }
  }
  
  // Add remaining stories to last sprint
  if (currentSprintStories.length > 0) {
    sprintBreakdown.push({
      sprint: currentSprint,
      stories: currentSprintStories,
      totalStoryPoints: currentSprintPoints,
      capacity: calculatedVelocity,
    })
  }
  
  return {
    storyGroups,
    storiesCount,
    suggestedStoryPoints,
    sprintBreakdown,
  }
}

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
  const systemPrompt = `You are an expert business analyst. Your task is to generate a comprehensive Business Requirements Document (BRD) strictly in valid HTML. 

Important rules:
1. Your output must be valid HTML only.
2. Do NOT include any text, explanations, or notes outside of HTML tags.
3. Include the full HTML structure with <html>, <head>, and <body> tags.
4. Use semantic HTML elements:
   - <h1> for the document title
   - <h2> for section headings
   - <p> for paragraphs
   - <ul> and <li> for lists
5. Ensure proper nesting and indentation.

The BRD should include these sections:
1. Executive Summary
2. Business Objectives
3. Functional Requirements (detailed)
4. Non-Functional Requirements (performance, security, scalability)
5. Assumptions and Constraints
6. Success Criteria

Strictly return only valid HTML.`

const userPrompt = `Generate a complete Business Requirements Document (BRD) in HTML format based on the following input:

${content}

Rules:
- Output must be valid HTML only.
- Include all sections from the system prompt with proper headings, paragraphs, and lists.
- Do NOT include any text outside the HTML.
- Ensure <html>, <head>, and <body> tags are present.`

  const messages: PerplexityMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  return await callPerplexityAI(messages)
}

/**
 * Generate Sprint Plan using Perplexity AI
 */
export async function generateSprintPlanWithPerplexity(
  brdText: string,
  teamMembers: number,
  capacityPerMember: number,
  sprintDuration: number,
  velocity?: number
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
  }>
}> {
  // Extract text content from HTML BRD
  const textContent = brdText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

  const totalCapacity = teamMembers * capacityPerMember * sprintDuration
  const calculatedVelocity = velocity || Math.floor(totalCapacity / 8)

  const systemPrompt = `You are an expert Agile coach and Scrum Master. Generate a detailed sprint plan based on a Business Requirements Document.

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
      "capacity": number
    }
  ]
}

Rules:
- Break down the BRD into logical epics (story groups)
- Each epic should have multiple user stories
- Assign story points using Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
- Distribute stories across sprints based on velocity: ${calculatedVelocity} story points per sprint
- Ensure each sprint doesn't exceed the velocity capacity
- storiesCount should be the total number of stories across all epics
- suggestedStoryPoints should be the sum of all story points
- sprintBreakdown should distribute stories across sprints respecting velocity limits`

  const userPrompt = `Based on this Business Requirements Document:

${textContent.substring(0, 8000)}

Team Configuration:
- Team Members: ${teamMembers}
- Capacity per Member: ${capacityPerMember} hours
- Sprint Duration: ${sprintDuration} weeks
- Velocity: ${calculatedVelocity} story points per sprint

Generate a comprehensive sprint plan with epics, user stories, story points, and sprint breakdown. Return ONLY valid JSON, no additional text.`

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



