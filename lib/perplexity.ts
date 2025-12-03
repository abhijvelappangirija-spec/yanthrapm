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
  const systemPrompt = `You are an expert business analyst. Generate a comprehensive Business Requirements Document (BRD) in HTML format based on the provided input. 

The BRD should include:
1. Executive Summary
2. Business Objectives
3. Functional Requirements (detailed)
4. Non-Functional Requirements (performance, security, scalability)
5. Assumptions and Constraints
6. Success Criteria

Format the output as HTML with proper headings (h1, h2), paragraphs (p), and lists (ul, li). Use semantic HTML structure.`

  const userPrompt = `Based on the following input, generate a comprehensive Business Requirements Document:

${content}

Please create a detailed BRD that covers all aspects mentioned in the system prompt.`

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

