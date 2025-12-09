/**
 * Jira Cloud API integration
 */

interface JiraStory {
  title: string
  description: string
  points: number
  epic: string
}

interface JiraConfig {
  baseUrl: string
  email: string
  apiToken: string
  projectKey: string
}

interface JiraIssue {
  id: string
  key: string
  self: string
}

interface JiraEpic {
  id: string
  key: string
  name: string
  issueId?: string // Epic issue ID for linking
}

/**
 * Create Jira API client with basic auth
 */
function getJiraAuthHeader(email: string, apiToken: string): string {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64')
  return `Basic ${credentials}`
}

/**
 * Convert description text to Jira's ADF (Atlassian Document Format)
 * Supports headings (h2., h3.), bullet lists (*), numbered lists (#), and checkboxes ([ ])
 */
function convertDescriptionToADF(description: string): any[] {
  if (!description || !description.trim()) {
    return [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'No description provided',
          },
        ],
      },
    ]
  }

  const lines = description.split('\n')
  const content: any[] = []
  let inBulletList = false
  let inNumberedList = false
  let currentListItems: any[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines (but close lists if needed)
    if (!line) {
      if (inBulletList && currentListItems.length > 0) {
        content.push({
          type: 'bulletList',
          content: currentListItems,
        })
        currentListItems = []
        inBulletList = false
      } else if (inNumberedList && currentListItems.length > 0) {
        content.push({
          type: 'orderedList',
          content: currentListItems,
        })
        currentListItems = []
        inNumberedList = false
      }
      continue
    }

    // Check for headings (h2., h3., etc.)
    const headingMatch = line.match(/^h([2-6])\.\s+(.+)$/)
    if (headingMatch) {
      // Close any open lists
      if (inBulletList && currentListItems.length > 0) {
        content.push({
          type: 'bulletList',
          content: currentListItems,
        })
        currentListItems = []
        inBulletList = false
      } else if (inNumberedList && currentListItems.length > 0) {
        content.push({
          type: 'orderedList',
          content: currentListItems,
        })
        currentListItems = []
        inNumberedList = false
      }

      const level = parseInt(headingMatch[1])
      const headingText = headingMatch[2]
      content.push({
        type: 'heading',
        attrs: { level },
        content: [
          {
            type: 'text',
            text: headingText,
            marks: [{ type: 'strong' }],
          },
        ],
      })
      continue
    }

    // Check for bullet list items (* or -)
    const bulletMatch = line.match(/^[\*\-]\s+(.+)$/)
    if (bulletMatch) {
      if (!inBulletList) {
        // Close numbered list if open
        if (inNumberedList && currentListItems.length > 0) {
          content.push({
            type: 'orderedList',
            content: currentListItems,
          })
          currentListItems = []
          inNumberedList = false
        }
        inBulletList = true
      }
      
      const itemText = bulletMatch[1]
      // Check for nested content (indented)
      const isNested = line.startsWith('  ') || line.startsWith('\t')
      currentListItems.push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineFormatting(itemText),
          },
        ],
      })
      continue
    }

    // Check for numbered list items (#)
    const numberedMatch = line.match(/^#\s+(.+)$/)
    if (numberedMatch) {
      if (!inNumberedList) {
        // Close bullet list if open
        if (inBulletList && currentListItems.length > 0) {
          content.push({
            type: 'bulletList',
            content: currentListItems,
          })
          currentListItems = []
          inBulletList = false
        }
        inNumberedList = true
      }
      
      const itemText = numberedMatch[1]
      currentListItems.push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineFormatting(itemText),
          },
        ],
      })
      continue
    }

    // Check for checkbox items ([ ] or [x])
    const checkboxMatch = line.match(/^\[([ x])\]\s+(.+)$/)
    if (checkboxMatch) {
      if (!inBulletList) {
        if (inNumberedList && currentListItems.length > 0) {
          content.push({
            type: 'orderedList',
            content: currentListItems,
          })
          currentListItems = []
          inNumberedList = false
        }
        inBulletList = true
      }
      
      const isChecked = checkboxMatch[1] === 'x'
      const itemText = checkboxMatch[2]
      currentListItems.push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: isChecked ? '☑ ' : '☐ ',
              },
              ...parseInlineFormatting(itemText),
            ],
          },
        ],
      })
      continue
    }

    // Regular paragraph
    // Close any open lists first
    if (inBulletList && currentListItems.length > 0) {
      content.push({
        type: 'bulletList',
        content: currentListItems,
      })
      currentListItems = []
      inBulletList = false
    } else if (inNumberedList && currentListItems.length > 0) {
      content.push({
        type: 'orderedList',
        content: currentListItems,
      })
      currentListItems = []
      inNumberedList = false
    }

    // Parse inline formatting (bold, italic, code)
    const paragraphContent = parseInlineFormatting(line)
    if (paragraphContent.length > 0) {
      content.push({
        type: 'paragraph',
        content: paragraphContent,
      })
    }
  }

  // Close any remaining lists
  if (inBulletList && currentListItems.length > 0) {
    content.push({
      type: 'bulletList',
      content: currentListItems,
    })
  } else if (inNumberedList && currentListItems.length > 0) {
    content.push({
      type: 'orderedList',
      content: currentListItems,
    })
  }

  return content.length > 0 ? content : [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: description,
        },
      ],
    },
  ]
}

/**
 * Parse inline formatting in text (bold, italic, code, links)
 */
function parseInlineFormatting(text: string): any[] {
  const content: any[] = []
  let currentIndex = 0
  let currentText = ''

  // Simple parser for *bold*, _italic_, `code`, and [link|url]
  while (currentIndex < text.length) {
    // Check for bold (*text*)
    if (text[currentIndex] === '*' && currentIndex + 1 < text.length) {
      const endIndex = text.indexOf('*', currentIndex + 1)
      if (endIndex > currentIndex + 1) {
        // Add any text before the bold
        if (currentText) {
          content.push({ type: 'text', text: currentText })
          currentText = ''
        }
        // Add bold text
        const boldText = text.substring(currentIndex + 1, endIndex)
        content.push({
          type: 'text',
          text: boldText,
          marks: [{ type: 'strong' }],
        })
        currentIndex = endIndex + 1
        continue
      }
    }

    // Check for italic (_text_)
    if (text[currentIndex] === '_' && currentIndex + 1 < text.length) {
      const endIndex = text.indexOf('_', currentIndex + 1)
      if (endIndex > currentIndex + 1) {
        // Add any text before the italic
        if (currentText) {
          content.push({ type: 'text', text: currentText })
          currentText = ''
        }
        // Add italic text
        const italicText = text.substring(currentIndex + 1, endIndex)
        content.push({
          type: 'text',
          text: italicText,
          marks: [{ type: 'em' }],
        })
        currentIndex = endIndex + 1
        continue
      }
    }

    // Check for code (`text`)
    if (text[currentIndex] === '`' && currentIndex + 1 < text.length) {
      const endIndex = text.indexOf('`', currentIndex + 1)
      if (endIndex > currentIndex + 1) {
        // Add any text before the code
        if (currentText) {
          content.push({ type: 'text', text: currentText })
          currentText = ''
        }
        // Add code text
        const codeText = text.substring(currentIndex + 1, endIndex)
        content.push({
          type: 'text',
          text: codeText,
          marks: [{ type: 'code' }],
        })
        currentIndex = endIndex + 1
        continue
      }
    }

    currentText += text[currentIndex]
    currentIndex++
  }

  // Add any remaining text
  if (currentText) {
    content.push({ type: 'text', text: currentText })
  }

  return content.length > 0 ? content : [{ type: 'text', text: text }]
}

/**
 * Find or create an Epic in Jira
 */
export async function findOrCreateEpic(
  epicName: string,
  config: JiraConfig
): Promise<JiraEpic> {
  const authHeader = getJiraAuthHeader(config.email, config.apiToken)
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  // First, try to find existing epic
  try {
    const searchResponse = await fetch(
      `${baseUrl}/rest/api/3/search?jql=project=${config.projectKey} AND type=Epic AND summary~"${encodeURIComponent(epicName)}"`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    )

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.issues && searchData.issues.length > 0) {
        const epic = searchData.issues[0]
        return {
          id: epic.id,
          key: epic.key,
          name: epic.fields.summary,
          issueId: epic.id, // Use the issue ID for linking
        }
      }
    }
  } catch (error) {
    console.log('Epic search failed, will create new epic:', error)
  }

  // Epic doesn't exist, create it
  try {
    const createResponse = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: {
            key: config.projectKey,
          },
          summary: epicName,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `Epic: ${epicName}`,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: 'Epic',
          },
        },
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Failed to create epic: ${createResponse.status} - ${errorText}`)
    }

    const epicData = await createResponse.json()
    return {
      id: epicData.id,
      key: epicData.key,
      name: epicName,
      issueId: epicData.id, // Use the issue ID for linking
    }
  } catch (error) {
    throw new Error(`Failed to create epic "${epicName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a Story in Jira
 */
export async function createJiraStory(
  story: JiraStory,
  epicKey: string,
  epicIssueId: string | undefined,
  config: JiraConfig
): Promise<JiraIssue> {
  const authHeader = getJiraAuthHeader(config.email, config.apiToken)
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  // Convert description to Jira's ADF format with proper structure
  const descriptionContent = convertDescriptionToADF(story.description)

  const issueBody: any = {
    fields: {
      project: {
        key: config.projectKey,
      },
      summary: story.title,
      description: {
        type: 'doc',
        version: 1,
        content: descriptionContent.length > 0 ? descriptionContent : [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: story.description || 'No description provided',
              },
            ],
          },
        ],
      },
      issuetype: {
        name: 'Story',
      },
    },
  }

  // Add story points (try common field IDs)
  // Note: Field IDs vary by Jira instance. Common IDs: customfield_10016, customfield_10020
  // Users may need to configure this based on their Jira instance
  const storyPointsFieldId = process.env.JIRA_STORY_POINTS_FIELD_ID || 'customfield_13805'
  if (story.points > 0) {
    issueBody.fields[storyPointsFieldId] = story.points
  }

  // Add epic link if epic key is provided
  // Note: Field IDs vary by Jira instance. Common IDs: customfield_10014, customfield_10011
  // Epic Link field typically expects the epic key as a string, but some instances may need the issue ID
  if (epicKey) {
    const epicLinkFieldId = process.env.JIRA_EPIC_LINK_FIELD_ID || 'parent'
    
    // Try using epic key first (most common format)
    // If that fails, the error will indicate what format is needed
    // Some Jira instances might need: epicKey, epicIssueId, or { key: epicKey }
    try {
      // Most Jira instances expect the epic key as a string
      issueBody.fields[epicLinkFieldId] = { key: epicKey }
    } catch (error) {
      // If setting as string fails, we'll let the API call fail and return the error
      // This will help users understand what format their Jira instance expects
      console.warn(`Note: Epic link field ${epicLinkFieldId} may need a different format. Using epic key: ${epicKey}`)
    }
  }

  try {
    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Failed to create story: ${response.status}`
      
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.errors) {
          // Extract specific field errors
          const fieldErrors = Object.entries(errorData.errors)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ')
          errorMessage += ` - ${fieldErrors}`
        } else if (errorData.errorMessages && errorData.errorMessages.length > 0) {
          errorMessage += ` - ${errorData.errorMessages.join(', ')}`
        } else {
          errorMessage += ` - ${errorText}`
        }
      } catch {
        errorMessage += ` - ${errorText}`
      }
      
      // Provide helpful hints for common errors
      if (errorText.includes('parent') || errorText.includes('Epic Link')) {
        errorMessage += '\n\nHint: The Epic Link field ID might be incorrect. Please check your JIRA_EPIC_LINK_FIELD_ID environment variable. Common values: customfield_10014, customfield_10011'
      }
      
      throw new Error(errorMessage)
    }

    const issueData = await response.json()
    return {
      id: issueData.id,
      key: issueData.key,
      self: issueData.self,
    }
  } catch (error) {
    throw new Error(`Failed to create story "${story.title}": ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create multiple Jira stories with epics
 */
export async function createJiraTickets(
  stories: JiraStory[],
  config: JiraConfig
): Promise<{
  success: Array<{ story: JiraStory; issue: JiraIssue; epic: JiraEpic }>
  errors: Array<{ story: JiraStory; error: string }>
}> {
  const success: Array<{ story: JiraStory; issue: JiraIssue; epic: JiraEpic }> = []
  const errors: Array<{ story: JiraStory; error: string }> = []

  // Group stories by epic
  const epicMap = new Map<string, JiraStory[]>()
  for (const story of stories) {
    if (!epicMap.has(story.epic)) {
      epicMap.set(story.epic, [])
    }
    epicMap.get(story.epic)!.push(story)
  }

  // Process each epic
  for (const [epicName, epicStories] of epicMap.entries()) {
    let epic: JiraEpic | null = null

    try {
      epic = await findOrCreateEpic(epicName, config)
    } catch (error) {
      // If epic creation fails, mark all stories in this epic as errors
      for (const story of epicStories) {
        errors.push({
          story,
          error: `Failed to create/find epic: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
      continue
    }

    // Create stories for this epic
    for (const story of epicStories) {
      try {
        const issue = await createJiraStory(story, epic.key, epic.issueId || epic.id, config)
        success.push({ story, issue, epic })
      } catch (error) {
        errors.push({
          story,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  return { success, errors }
}

