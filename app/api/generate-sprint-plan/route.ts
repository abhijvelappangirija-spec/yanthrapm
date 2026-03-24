import { NextRequest, NextResponse } from 'next/server'

import { classifyAiInput } from '@/lib/ai/input-classification'
import { AiGenerationMetadata } from '@/lib/ai/types'
import { AiPolicyError } from '@/lib/ai/provider-policy'
import {
  buildAiMetadataColumns,
  executeWithOptionalAiMetadata,
} from '@/lib/ai/persistence'
import { generateSprintPlanWithPolicy } from '@/lib/ai/service'
import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import { parseSprintPlanPayload } from '@/lib/sprint-plan-payload'
import {
  RequestValidationError,
  requireObjectPayload,
} from '@/lib/security/request-validation'
import {
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

interface StoryGroup {
  epic: string
  stories: string[]
  storyPoints: number
}

interface SprintBreakdown {
  sprint: number
  stories: string[]
  totalStoryPoints: number
  capacity: number
  qaTasks?: string[]
  qaHours?: number
  pmTasks?: string[]
  pmHours?: number
  architectTasks?: string[]
  architectHours?: number
}

interface SprintPlanResponse {
  storyGroups: StoryGroup[]
  storiesCount: number
  suggestedStoryPoints: number
  sprintBreakdown: SprintBreakdown[]
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)
    const payload = requireObjectPayload(await request.json())
    const {
      brdText,
      technicalContext = '',
      teamMembers,
      capacityPerMember,
      sprintDuration,
      velocity,
      brdId,
      useDummyData,
      requirePrivateProcessing,
      resources,
    } = parseSprintPlanPayload(payload)
    const classification = classifyAiInput(
      `${brdText}\n\n${technicalContext || ''}`
    )
    const effectiveRequirePrivateProcessing =
      requirePrivateProcessing || classification.requirePrivateProcessing

    const {
      ai,
      sprintPlan,
    }: {
      ai: AiGenerationMetadata
      sprintPlan: SprintPlanResponse
    } = await generateSprintPlanWithPolicy({
        brdText,
        technicalContext,
        teamMembers,
        capacityPerMember,
        sprintDuration,
        velocity,
        resources,
        useDummyData,
        requirePrivateProcessing: effectiveRequirePrivateProcessing,
      })

    if (!sprintPlan.storyGroups || !Array.isArray(sprintPlan.storyGroups)) {
      throw new Error('Generated sprint plan failed validation')
    }

    if (!sprintPlan.sprintBreakdown || !Array.isArray(sprintPlan.sprintBreakdown)) {
      throw new Error('Generated sprint plan failed validation')
    }

    const supabase = createActorScopedSupabaseClient(request)

    let savedId: string | null = null
    let aiMetadataSaved = false
    try {
      const insertData = {
        user_id: actor.userId,
        brd_id: brdId || null,
        team_members: teamMembers,
        capacity_per_member: capacityPerMember,
        sprint_duration: sprintDuration,
        velocity: velocity || null,
        story_groups: sprintPlan.storyGroups,
        stories_count: sprintPlan.storiesCount,
        suggested_story_points: sprintPlan.suggestedStoryPoints,
        sprint_breakdown: sprintPlan.sprintBreakdown,
        created_at: new Date().toISOString(),
      }

      const dataSize = JSON.stringify(insertData).length
      console.log(`Attempting to save sprint plan. Data size: ${dataSize} bytes`)

      if (dataSize > 1024 * 1024) {
        console.warn(
          `Warning: Sprint plan data is large (${Math.round(dataSize / 1024)}KB). This may cause issues.`
        )
      }

      const { data, error, aiMetadataSaved: metadataPersisted } =
        await executeWithOptionalAiMetadata<{ id: string }>((includeAiMetadata) =>
          supabase
            .from('sprints')
            .insert({
              ...insertData,
              ...(includeAiMetadata ? buildAiMetadataColumns(ai) : {}),
            })
            .select()
            .single()
        )

      aiMetadataSaved = metadataPersisted

      if (error) {
        let errorMessage = error.message || 'Unknown error'
        const isHtmlError =
          typeof errorMessage === 'string' &&
          (errorMessage.includes('<html>') ||
            errorMessage.includes('500 Internal Server Error'))

        if (isHtmlError) {
          errorMessage =
            'Supabase server error (500) - This may be due to data size limits, network issues, or Supabase configuration'
          console.error('Supabase returned HTML error page (likely 500 error from Cloudflare)')
        }

        console.error('Supabase error:', {
          message: errorMessage,
          code: error.code,
          hint: error.hint,
          isHtmlError,
        })

        console.warn(
          'Failed to save sprint plan to Supabase, but continuing with response. Sprint plan will still be returned to the user.'
        )
      } else if (data) {
        savedId = data.id
        console.log('Successfully saved sprint plan to Supabase:', savedId)
      } else {
        console.warn('Sprint plan generated, but the saved record could not be confirmed.')
      }
    } catch (saveError) {
      console.error('Unexpected error saving to Supabase:', saveError)
    }

    return NextResponse.json({
      success: true,
      ...sprintPlan,
      id: savedId,
      saved: savedId !== null,
      provider: ai.provider,
      ai,
      aiMetadataSaved,
      classification,
    })
  } catch (error) {
    if (
      error instanceof AiPolicyError ||
      error instanceof ActorResolutionError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error generating sprint plan:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        {
          error: `${getPublicServiceErrorMessage('AI provider', error)} Enable dummy data for local testing or fix the network/TLS configuration.`,
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate sprint plan' },
      { status: 500 }
    )
  }
}
