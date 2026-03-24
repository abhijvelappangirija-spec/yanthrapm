import {
  RequestValidationError,
  readNumberField,
  readRequiredStringField,
  readStringField,
} from '@/lib/security/request-validation'

export type ProjectResourceInput = {
  id: string
  name: string
  tech_stack: string
  capacity: number
}

export type ProjectMutationInput = {
  name: string
  description?: string
  team_members: number
  capacity_per_member: number
  sprint_duration: number
  tech_stack?: string
  roles?: string[]
  resources?: ProjectResourceInput[]
}

function parseRoles(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new RequestValidationError('roles must be an array of strings')
  }

  const roles = value
    .map((role) => {
      if (typeof role !== 'string') {
        throw new RequestValidationError('roles must be an array of strings')
      }

      return role.trim()
    })
    .filter(Boolean)

  return roles.length > 0 ? roles : undefined
}

function parseResources(value: unknown): ProjectResourceInput[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new RequestValidationError('resources must be an array')
  }

  const resources = value.map((resource, index) => {
    if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
      throw new RequestValidationError(`resources[${index}] must be an object`)
    }

    const payload = resource as Record<string, unknown>
    const capacity = readNumberField(payload, 'capacity', {
      required: true,
      min: 1,
      max: 200,
      integer: true,
    })

    return {
      id:
        readStringField(payload, 'id', {
          maxLength: 200,
        }) || crypto.randomUUID(),
      name: readRequiredStringField(payload, 'name', { maxLength: 200 }),
      tech_stack: readRequiredStringField(payload, 'tech_stack', { maxLength: 500 }),
      capacity:
        capacity === undefined
          ? (() => {
              throw new RequestValidationError(`resources[${index}].capacity is required`)
            })()
          : capacity,
    }
  })

  return resources.length > 0 ? resources : undefined
}

export function parseProjectPayload(
  payload: Record<string, unknown>
): ProjectMutationInput {
  const teamMembers = readNumberField(payload, 'team_members', {
    required: true,
    min: 1,
    max: 1000,
    integer: true,
  })
  const capacityPerMember = readNumberField(payload, 'capacity_per_member', {
    required: true,
    min: 1,
    max: 200,
    integer: true,
  })
  const sprintDuration = readNumberField(payload, 'sprint_duration', {
    required: true,
    min: 1,
    max: 52,
    integer: true,
  })

  if (
    teamMembers === undefined ||
    capacityPerMember === undefined ||
    sprintDuration === undefined
  ) {
    throw new RequestValidationError(
      'Name, team members, capacity per member, and sprint duration are required'
    )
  }

  return {
    name: readRequiredStringField(payload, 'name', { maxLength: 200 }),
    description: readStringField(payload, 'description', {
      maxLength: 4000,
    }),
    team_members: teamMembers,
    capacity_per_member: capacityPerMember,
    sprint_duration: sprintDuration,
    tech_stack: readStringField(payload, 'tech_stack', {
      maxLength: 500,
    }),
    roles: parseRoles(payload.roles),
    resources: parseResources(payload.resources),
  }
}
