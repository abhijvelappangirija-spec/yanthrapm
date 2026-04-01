import { BrdEvidence } from '@/lib/ai/brd-evidence'
import { BrdValidationResult } from '@/lib/ai/brd-validator'
import { BRD_PROMPT_PACKAGE_VERSION } from '@/lib/ai/brd-pipeline-version'

export type BrdReviewWorkflowStatus =
  | 'draft'
  | 'internal-review'
  | 'stakeholder-review'

export type BrdReviewMarkers = {
  /** Assumptions register has content and the BRD meets a minimum quality bar for review. */
  assumptionsReadyForReview: boolean
  /** Risks register has content and the BRD meets a minimum quality bar for review. */
  risksReadyForReview: boolean
  /** Open questions or missing sections still need product input. */
  openQuestionsOutstanding: boolean
  /** Suggested next step in a lightweight governance workflow. */
  recommendedWorkflowStatus: BrdReviewWorkflowStatus
}

export type BrdGovernancePayload = {
  validation: BrdValidationResult
  reviewMarkers: BrdReviewMarkers
  promptPackageVersion: string
}

export function buildBrdReviewMarkers(
  evidence: BrdEvidence,
  validation: BrdValidationResult
): BrdReviewMarkers {
  const openQuestionsOutstanding =
    evidence.openQuestions.length > 0 || validation.missingSections.length > 0

  const assumptionsReadyForReview =
    evidence.assumptions.length > 0 && validation.score >= 55

  const risksReadyForReview = evidence.risks.length > 0 && validation.score >= 55

  let recommendedWorkflowStatus: BrdReviewWorkflowStatus = 'draft'
  if (
    validation.score >= 85 &&
    !openQuestionsOutstanding &&
    validation.unsupportedClaims.length === 0
  ) {
    recommendedWorkflowStatus = 'stakeholder-review'
  } else if (validation.score >= 50) {
    recommendedWorkflowStatus = 'internal-review'
  }

  return {
    assumptionsReadyForReview,
    risksReadyForReview,
    openQuestionsOutstanding,
    recommendedWorkflowStatus,
  }
}

export function buildBrdGovernancePayload(
  evidence: BrdEvidence,
  validation: BrdValidationResult
): BrdGovernancePayload {
  return {
    validation,
    reviewMarkers: buildBrdReviewMarkers(evidence, validation),
    promptPackageVersion: BRD_PROMPT_PACKAGE_VERSION,
  }
}
