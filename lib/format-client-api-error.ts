/** Maps API JSON error payloads (optional `cause` from dev-only server hints) to a single message. */
export function formatClientApiErrorMessage(data: unknown, fallback: string): string {
  const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const base = typeof record?.error === 'string' ? record.error : fallback
  const cause = typeof record?.cause === 'string' ? record.cause.trim() : ''

  if (cause) {
    return `${base}\n\nDetail: ${cause}`
  }

  return base
}
