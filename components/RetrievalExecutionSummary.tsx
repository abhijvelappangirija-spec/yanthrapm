'use client'

export type RetrievalExecutionSummaryProps = {
  execution: {
    attempted?: boolean
    performed?: boolean
    skippedReason?: string
    useCase?: string
    sanitizedQuery?: string
    retrievedAt?: string
    facts?: string[]
    sources?: Array<{ url: string; retrievedAt?: string }>
  } | null
}

function formatTime(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function RetrievalExecutionSummary({
  execution,
}: RetrievalExecutionSummaryProps) {
  if (!execution) {
    return null
  }

  const hasFacts = (execution.facts?.length ?? 0) > 0
  const hasSources = (execution.sources?.length ?? 0) > 0

  if (!execution.attempted && !execution.performed && !hasFacts && !hasSources) {
    return null
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-900">
      <p className="font-semibold uppercase tracking-wide text-violet-700 mb-2">
        Controlled retrieval
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {execution.performed ? (
          <span className="rounded-full bg-white px-2 py-1 font-medium border border-violet-200">
            Performed
          </span>
        ) : execution.attempted ? (
          <span className="rounded-full bg-white px-2 py-1 font-medium border border-violet-200">
            Not used
          </span>
        ) : null}
        {execution.useCase && (
          <span className="rounded-full bg-white px-2 py-1 border border-violet-200">
            Use case: {execution.useCase.replace(/-/g, ' ')}
          </span>
        )}
        {execution.retrievedAt && (
          <span className="rounded-full bg-white px-2 py-1 border border-violet-200">
            Retrieved: {formatTime(execution.retrievedAt)}
          </span>
        )}
      </div>
      {execution.skippedReason && (
        <p className="text-violet-800 mb-2">
          <span className="font-medium">Reason:</span> {execution.skippedReason}
        </p>
      )}
      {execution.sanitizedQuery && (
        <p className="text-violet-800 mb-2 break-words">
          <span className="font-medium">Query:</span> {execution.sanitizedQuery}
        </p>
      )}
      {hasFacts && (
        <div className="mt-2">
          <p className="font-medium text-violet-800 mb-1">Reference facts</p>
          <ul className="list-disc pl-4 space-y-1 text-violet-900">
            {execution.facts!.slice(0, 12).map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
          {(execution.facts!.length ?? 0) > 12 && (
            <p className="mt-1 text-violet-700">…and more</p>
          )}
        </div>
      )}
      {hasSources && (
        <div className="mt-2">
          <p className="font-medium text-violet-800 mb-1">Approved-domain sources</p>
          <ul className="list-disc pl-4 space-y-1">
            {execution.sources!.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-700 underline break-all"
                >
                  {s.url}
                </a>
                {s.retrievedAt && (
                  <span className="text-violet-600 ml-1">
                    ({formatTime(s.retrievedAt)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
