'use client'

type AiAuditSummaryProps = {
  ai: {
    provider?: string | null
    model?: string | null
    task?: string | null
    isExternal?: boolean | null
    routingReason?: string | null
    generatedAt?: string | null
    promptPackageVersion?: string | null
  } | null | undefined
  title?: string
  compact?: boolean
}

function formatLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

export default function AiAuditSummary({
  ai,
  title = 'AI Routing Details',
  compact = false,
}: AiAuditSummaryProps) {
  if (
    !ai?.provider &&
    !ai?.model &&
    !ai?.task &&
    !ai?.routingReason &&
    !ai?.promptPackageVersion
  ) {
    return null
  }

  const formattedTask = formatLabel(ai.task)
  const formattedRoute = formatLabel(ai.routingReason)
  const generatedAt = formatTimestamp(ai.generatedAt)

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 ${
        compact ? 'p-2' : 'p-3'
      }`}
    >
      {!compact && (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
          {title}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {ai.provider && (
          <span className="rounded-full bg-white px-2 py-1 font-medium text-slate-700 border border-slate-200">
            Provider: {ai.provider}
          </span>
        )}
        {ai.isExternal !== undefined && ai.isExternal !== null && (
          <span
            className={`rounded-full px-2 py-1 font-medium border ${
              ai.isExternal
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {ai.isExternal ? 'External Route' : 'Private Route'}
          </span>
        )}
        {formattedTask && (
          <span className="rounded-full bg-white px-2 py-1 font-medium text-slate-700 border border-slate-200">
            Task: {formattedTask}
          </span>
        )}
        {formattedRoute && (
          <span className="rounded-full bg-white px-2 py-1 font-medium text-slate-700 border border-slate-200">
            Policy: {formattedRoute}
          </span>
        )}
      </div>
      {!compact && (
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          {ai.model && (
            <p>
              <span className="font-medium text-slate-700">Model:</span> {ai.model}
            </p>
          )}
          {generatedAt && (
            <p>
              <span className="font-medium text-slate-700">Generated:</span> {generatedAt}
            </p>
          )}
          {ai.promptPackageVersion && (
            <p>
              <span className="font-medium text-slate-700">Prompt package:</span>{' '}
              {ai.promptPackageVersion}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
