type ErrorRecord = Record<string, unknown>

function isObject(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null
}

function collectErrorParts(error: unknown, seen: Set<unknown> = new Set()): string[] {
  if (error == null || seen.has(error)) {
    return []
  }

  if (typeof error === 'string') {
    return [error]
  }

  if (!isObject(error)) {
    return [String(error)]
  }

  seen.add(error)

  const parts: string[] = []
  const keys: Array<keyof ErrorRecord> = ['message', 'details', 'hint', 'code']

  for (const key of keys) {
    const value = error[key]
    if (typeof value === 'string' && value.trim()) {
      parts.push(value)
    }
  }

  if ('cause' in error) {
    parts.push(...collectErrorParts(error.cause, seen))
  }

  return parts
}

export function getServiceErrorText(error: unknown): string {
  return collectErrorParts(error).join(' ').toLowerCase()
}

export function isConnectivityError(error: unknown): boolean {
  const text = getServiceErrorText(error)

  return [
    'fetch failed',
    'enotfound',
    'eai_again',
    'econnrefused',
    'etimedout',
    'certificate',
    'tls',
    'unable_to_get_issuer_cert_locally',
    'self signed certificate',
    'network',
  ].some((pattern) => text.includes(pattern))
}

export function getPublicServiceErrorMessage(serviceName: string, error: unknown): string {
  const text = getServiceErrorText(error)

  if (text.includes('enotfound')) {
    return `${serviceName} is unreachable because the configured host could not be resolved.`
  }

  if (
    text.includes('unable_to_get_issuer_cert_locally') ||
    text.includes('self signed certificate') ||
    text.includes('certificate')
  ) {
    return `${serviceName} request failed because TLS certificate validation is failing on this machine.`
  }

  if (isConnectivityError(error)) {
    return `${serviceName} is temporarily unreachable.`
  }

  return `${serviceName} request failed.`
}
