const DEFAULT_MAX_LENGTH = 50000

export class RequestValidationError extends Error {
  status: number

  constructor(message: string, status: number = 400) {
    super(message)
    this.name = 'RequestValidationError'
    this.status = status
  }
}

type StringFieldOptions = {
  required?: boolean
  maxLength?: number
  trim?: boolean
}

type NumberFieldOptions = {
  required?: boolean
  min?: number
  max?: number
  integer?: boolean
}

export function requireObjectPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError('Invalid request body')
  }

  return value as Record<string, unknown>
}

export function readStringField(
  payload: Record<string, unknown>,
  fieldName: string,
  options: StringFieldOptions = {}
): string | undefined {
  const { required = false, maxLength = DEFAULT_MAX_LENGTH, trim = true } = options
  const value = payload[fieldName]

  if (value === undefined || value === null) {
    if (required) {
      throw new RequestValidationError(`${fieldName} is required`)
    }

    return undefined
  }

  if (typeof value !== 'string') {
    throw new RequestValidationError(`${fieldName} must be a string`)
  }

  const normalizedValue = trim ? value.trim() : value

  if (!normalizedValue) {
    if (required) {
      throw new RequestValidationError(`${fieldName} is required`)
    }

    return undefined
  }

  if (normalizedValue.length > maxLength) {
    throw new RequestValidationError(`${fieldName} exceeds the allowed size`)
  }

  return normalizedValue
}

export function readRequiredStringField(
  payload: Record<string, unknown>,
  fieldName: string,
  options: Omit<StringFieldOptions, 'required'> = {}
): string {
  const value = readStringField(payload, fieldName, { ...options, required: true })

  if (value === undefined) {
    throw new RequestValidationError(`${fieldName} is required`)
  }

  return value
}

export function readBooleanField(
  payload: Record<string, unknown>,
  fieldName: string,
  defaultValue: boolean = false
): boolean {
  const value = payload[fieldName]

  if (value === undefined || value === null) {
    return defaultValue
  }

  if (typeof value !== 'boolean') {
    throw new RequestValidationError(`${fieldName} must be a boolean`)
  }

  return value
}

export function readNumberField(
  payload: Record<string, unknown>,
  fieldName: string,
  options: NumberFieldOptions = {}
): number | undefined {
  const {
    required = false,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    integer = false,
  } = options
  const value = payload[fieldName]

  if (value === undefined || value === null) {
    if (required) {
      throw new RequestValidationError(`${fieldName} is required`)
    }

    return undefined
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RequestValidationError(`${fieldName} must be a number`)
  }

  if (integer && !Number.isInteger(value)) {
    throw new RequestValidationError(`${fieldName} must be an integer`)
  }

  if (value < min || value > max) {
    throw new RequestValidationError(`${fieldName} is out of range`)
  }

  return value
}
