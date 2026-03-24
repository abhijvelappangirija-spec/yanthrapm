import {
  RequestValidationError,
  readBooleanField,
  readNumberField,
  readRequiredStringField,
  readStringField,
} from '@/lib/security/request-validation'

export type SprintPlanResourceInput = {
  name: string
  role: string
  tech_stack?: string
  capacity: number
}

export type SprintPlanRequestInput = {
  brdText: string
  technicalContext?: string
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  velocity?: number
  brdId?: string
  useDummyData: boolean
  requirePrivateProcessing: boolean
  resources?: SprintPlanResourceInput[]
}

function parseResources(value: unknown): SprintPlanResourceInput[] | undefined {
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

    if (capacity === undefined) {
      throw new RequestValidationError(`resources[${index}].capacity is required`)
    }

    return {
      name: readRequiredStringField(payload, 'name', { maxLength: 200 }),
      role: readRequiredStringField(payload, 'role', { maxLength: 200 }),
      tech_stack: readStringField(payload, 'tech_stack', { maxLength: 500 }),
      capacity,
    }
  })

  return resources.length > 0 ? resources : undefined
}

export function parseSprintPlanPayload(
  payload: Record<string, unknown>
): SprintPlanRequestInput {
  const teamMembers = readNumberField(payload, 'teamMembers', {
    required: true,
    min: 1,
    max: 1000,
    integer: true,
  })
  const capacityPerMember = readNumberField(payload, 'capacityPerMember', {
    required: true,
    min: 1,
    max: 200,
    integer: true,
  })
  const sprintDuration = readNumberField(payload, 'sprintDuration', {
    required: true,
    min: 1,
    max: 52,
    integer: true,
  })
  const velocity = readNumberField(payload, 'velocity', {
    min: 1,
    max: 10000,
    integer: true,
  })

  if (
    teamMembers === undefined ||
    capacityPerMember === undefined ||
    sprintDuration === undefined
  ) {
    throw new RequestValidationError(
      'Team members, capacity per member, and sprint duration are required'
    )
  }

  return {
    brdText: readRequiredStringField(payload, 'brdText', {
      maxLength: 150000,
      trim: false,
    }),
    technicalContext: readStringField(payload, 'technicalContext', {
      maxLength: 50000,
      trim: false,
    }),
    teamMembers,
    capacityPerMember,
    sprintDuration,
    velocity,
    brdId: readStringField(payload, 'brdId', { maxLength: 200 }),
    useDummyData: readBooleanField(payload, 'useDummyData', false),
    requirePrivateProcessing: readBooleanField(payload, 'requirePrivateProcessing', false),
    resources: parseResources(payload.resources),
  }
}
