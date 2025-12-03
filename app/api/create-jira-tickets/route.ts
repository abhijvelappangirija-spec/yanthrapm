import { NextRequest, NextResponse } from 'next/server'
import { createJiraTickets } from '@/lib/jira'

interface JiraStory {
  title: string
  description: string
  points: number
  epic: string
}

interface CreateJiraTicketsRequest {
  stories: JiraStory[]
  jiraEmail: string
  jiraProjectKey: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      stories,
      jiraEmail,
      jiraProjectKey,
    }: CreateJiraTicketsRequest = await request.json()

    // Get Jira configuration from environment variables
    const jiraBaseUrl = process.env.JIRA_BASE_URL
    const jiraApiToken = process.env.JIRA_API_TOKEN

    // Validation
    if (!stories || !Array.isArray(stories) || stories.length === 0) {
      return NextResponse.json(
        { error: 'Stories array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!jiraBaseUrl || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
      return NextResponse.json(
        { error: 'Jira configuration is incomplete. Please ensure JIRA_BASE_URL and JIRA_API_TOKEN are set in environment variables, and provide email and projectKey in the request.' },
        { status: 400 }
      )
    }

    // Validate each story
    for (const story of stories) {
      if (!story.title || !story.epic) {
        return NextResponse.json(
          { error: 'Each story must have a title and epic' },
          { status: 400 }
        )
      }
    }

    // Create Jira tickets
    const result = await createJiraTickets(stories, {
      baseUrl: jiraBaseUrl,
      email: jiraEmail,
      apiToken: jiraApiToken,
      projectKey: jiraProjectKey,
    })

    return NextResponse.json({
      success: true,
      created: result.success.length,
      failed: result.errors.length,
      results: {
        success: result.success.map((item) => ({
          storyTitle: item.story.title,
          issueKey: item.issue.key,
          issueUrl: item.issue.self,
          epicKey: item.epic.key,
          epicName: item.epic.name,
        })),
        errors: result.errors.map((item) => ({
          storyTitle: item.story.title,
          error: item.error,
        })),
      },
    })
  } catch (error) {
    console.error('Error creating Jira tickets:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

