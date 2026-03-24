import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import { parseCreateJiraTicketsPayload } from '@/lib/jira-payload'
import { createJiraTickets } from '@/lib/jira'
import {
  RequestValidationError,
  requireObjectPayload,
} from '@/lib/security/request-validation'
import {
  getPublicServiceErrorMessage,
  getServiceErrorText,
  isConnectivityError,
} from '@/lib/service-errors'

function getPublicJiraTicketError(error: string): string {
  const normalized = error.toLowerCase()

  if (
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden')
  ) {
    return 'Jira rejected the request. Check the Jira user permissions and project access.'
  }

  if (normalized.includes('400') || normalized.includes('field')) {
    return 'Jira rejected the payload. Check the Jira field configuration and project settings.'
  }

  if (isConnectivityError(error)) {
    return getPublicServiceErrorMessage('Jira Cloud', error)
  }

  return 'Failed to create the Jira issue for this story.'
}

export async function POST(request: NextRequest) {
  try {
    await resolveRequestActor(request)
    const payload = requireObjectPayload(await request.json())
    const { stories, jiraEmail, jiraProjectKey } = parseCreateJiraTicketsPayload(payload)

    // Get Jira configuration from environment variables
    const jiraBaseUrl = process.env.JIRA_BASE_URL
    const jiraApiToken = process.env.JIRA_API_TOKEN

    if (!jiraBaseUrl || !jiraEmail || !jiraApiToken || !jiraProjectKey) {
      return NextResponse.json(
        { error: 'Jira configuration is incomplete. Please ensure JIRA_BASE_URL and JIRA_API_TOKEN are set in environment variables, and provide email and projectKey in the request.' },
        { status: 400 }
      )
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
          error: getPublicJiraTicketError(item.error),
        })),
      },
    })
  } catch (error) {
    if (
      error instanceof ActorResolutionError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error creating Jira tickets:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        { error: getPublicServiceErrorMessage('Jira Cloud', error) },
        { status: 503 }
      )
    }

    const errorText = getServiceErrorText(error)
    if (errorText.includes('401') || errorText.includes('403')) {
      return NextResponse.json(
        {
          error:
            'Jira rejected the request. Check the Jira user permissions and project access.',
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create Jira tickets' },
      { status: 500 }
    )
  }
}
