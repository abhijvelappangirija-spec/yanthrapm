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
}

/**
 * Create Jira API client with basic auth
 */
function getJiraAuthHeader(email: string, apiToken: string): string {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64')
  return `Basic ${credentials}`
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
  config: JiraConfig
): Promise<JiraIssue> {
  const authHeader = getJiraAuthHeader(config.email, config.apiToken)
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  // Convert description to Jira's ADF format
  const descriptionContent = story.description
    .split('\n')
    .map((line) => ({
      type: 'paragraph',
      content: line.trim()
        ? [
            {
              type: 'text',
              text: line.trim(),
            },
          ]
        : [],
    }))
    .filter((para) => para.content.length > 0)

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
  if (epicKey) {
    const epicLinkFieldId = process.env.JIRA_EPIC_LINK_FIELD_ID || 'parent'
    issueBody.fields[epicLinkFieldId] = epicKey
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
      throw new Error(`Failed to create story: ${response.status} - ${errorText}`)
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
        const issue = await createJiraStory(story, epic.key, config)
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

