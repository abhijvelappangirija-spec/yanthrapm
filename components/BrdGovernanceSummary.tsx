'use client'

export type BrdGovernanceSummaryProps = {
  governance: {
    validation: {
      score: number
      missingSections: string[]
      missingEvidenceReferences: string[]
      repaired: boolean
      unsupportedClaims: Array<{ section: string; claim: string; reason: string }>
    }
    reviewMarkers: {
      assumptionsReadyForReview: boolean
      risksReadyForReview: boolean
      openQuestionsOutstanding: boolean
      recommendedWorkflowStatus: string
    }
    promptPackageVersion: string
  } | null
}

function formatWorkflow(status: string): string {
  return status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function BrdGovernanceSummary({ governance }: BrdGovernanceSummaryProps) {
  if (!governance) {
    return null
  }

  const { validation, reviewMarkers } = governance

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
      <p className="font-semibold uppercase tracking-wide text-sky-800 mb-2">
        BRD quality and review
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="rounded-full bg-white px-2 py-1 font-medium border border-sky-200">
          Score: {validation.score}/100
        </span>
        {validation.repaired && (
          <span className="rounded-full bg-amber-100 px-2 py-1 font-medium border border-amber-300 text-amber-900">
            Fallback HTML applied
          </span>
        )}
        <span className="rounded-full bg-white px-2 py-1 border border-sky-200">
          Next step: {formatWorkflow(reviewMarkers.recommendedWorkflowStatus)}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-sky-900">
        <p>
          <span className="font-medium">Assumptions ready for review:</span>{' '}
          {reviewMarkers.assumptionsReadyForReview ? 'Yes' : 'No'}
        </p>
        <p>
          <span className="font-medium">Risks ready for review:</span>{' '}
          {reviewMarkers.risksReadyForReview ? 'Yes' : 'No'}
        </p>
        <p className="sm:col-span-2">
          <span className="font-medium">Open questions / gaps:</span>{' '}
          {reviewMarkers.openQuestionsOutstanding ? 'Yes' : 'No'}
        </p>
      </div>
      {validation.missingSections.length > 0 && (
        <p className="text-sky-900 mb-1">
          <span className="font-medium">Missing sections:</span>{' '}
          {validation.missingSections.join(', ')}
        </p>
      )}
      {validation.unsupportedClaims.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-sky-800">
            Unsupported claims ({validation.unsupportedClaims.length})
          </summary>
          <ul className="mt-1 list-disc pl-4 space-y-1 text-sky-900">
            {validation.unsupportedClaims.slice(0, 8).map((c, i) => (
              <li key={i}>
                <span className="font-medium">{c.section}:</span> {c.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-2 text-sky-800">
        <span className="font-medium">Prompt package:</span> {governance.promptPackageVersion}
      </p>
    </div>
  )
}
