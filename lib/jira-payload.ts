import {
  RequestValidationError,
  readNumberField,
  readRequiredStringField,
} from '@/lib/security/request-validation'

export type JiraStoryInput = {
  title: string
  description: string
  points: number
  epic: string
}

export type CreateJiraTicketsInput = {
  stories: JiraStoryInput[]
  jiraEmail: string
  jiraProjectKey: string
}

function parseStories(value: unknown): JiraStoryInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RequestValidationError('Stories array is required and must not be empty')
  }

  return value.map((story, index) => {
    if (!story || typeof story !== 'object' || Array.isArray(story)) {
      throw new RequestValidationError(`stories[${index}] must be an object`)
    }

    const payload = story as Record<string, unknown>
    const points = readNumberField(payload, 'points', {
      required: true,
      min: 0,
      max: 1000,
      integer: true,
    })

    if (points === undefined) {
      throw new RequestValidationError(`stories[${index}].points is required`)
    }

    return {
      title: readRequiredStringField(payload, 'title', { maxLength: 500 }),
      description: readRequiredStringField(payload, 'description', {
        maxLength: 50000,
        trim: false,
      }),
      points,
      epic: readRequiredStringField(payload, 'epic', { maxLength: 200 }),
    }
  })
}

export function parseCreateJiraTicketsPayload(
  payload: Record<string, unknown>
): CreateJiraTicketsInput {
  return {
    stories: parseStories(payload.stories),
    jiraEmail: readRequiredStringField(payload, 'jiraEmail', { maxLength: 320 }),
    jiraProjectKey: readRequiredStringField(payload, 'jiraProjectKey', {
      maxLength: 50,
    }),
  }
}
