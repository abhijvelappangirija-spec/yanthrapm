import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateSprintPlanWithPerplexity } from '@/lib/perplexity'

interface SprintPlanRequest {
  brdText: string
  teamMembers: number
  capacityPerMember: number
  sprintDuration: number
  velocity?: number
  brdId?: string
  userId?: string
  useDummyData?: boolean
}

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
}

interface SprintPlanResponse {
  storyGroups: StoryGroup[]
  storiesCount: number
  suggestedStoryPoints: number
  sprintBreakdown: SprintBreakdown[]
}

export async function POST(request: NextRequest) {
  try {
    const {
      brdText,
      teamMembers,
      capacityPerMember,
      sprintDuration,
      velocity,
      brdId,
      userId,
      useDummyData,
    }: SprintPlanRequest = await request.json()

    if (!brdText) {
      return NextResponse.json(
        { error: 'BRD text is required' },
        { status: 400 }
      )
    }

    if (!teamMembers || !capacityPerMember || !sprintDuration) {
      return NextResponse.json(
        { error: 'Team members, capacity per member, and sprint duration are required' },
        { status: 400 }
      )
    }

    // Generate sprint plan using Perplexity AI or dummy data
    let sprintPlan
    if (useDummyData) {
      const { generateDummySprintPlan } = await import('@/lib/perplexity')
      sprintPlan = generateDummySprintPlan(
        teamMembers,
        capacityPerMember,
        sprintDuration,
        velocity
      )
      console.log('Using dummy sprint plan data for testing')
    } else {
      sprintPlan = await generateSprintPlanWithPerplexity(
        brdText,
        teamMembers,
        capacityPerMember,
        sprintDuration,
        velocity
      )
    }

    // Validate sprint plan data before saving
    if (!sprintPlan.storyGroups || !Array.isArray(sprintPlan.storyGroups)) {
      throw new Error('Invalid sprint plan: storyGroups is missing or not an array')
    }

    if (!sprintPlan.sprintBreakdown || !Array.isArray(sprintPlan.sprintBreakdown)) {
      throw new Error('Invalid sprint plan: sprintBreakdown is missing or not an array')
    }

    // Try to store in Supabase, but don't fail if it doesn't work
    let savedId: string | null = null
    try {
      // Prepare data for insertion
      const insertData = {
        user_id: userId || 'anonymous',
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

      // Log data size for debugging
      const dataSize = JSON.stringify(insertData).length
      console.log(`Attempting to save sprint plan. Data size: ${dataSize} bytes`)
      
      // Check if data is too large (PostgreSQL JSONB has practical limits)
      // If over 1MB, log a warning but still try
      if (dataSize > 1024 * 1024) {
        console.warn(`Warning: Sprint plan data is large (${Math.round(dataSize / 1024)}KB). This may cause issues.`)
      }

      const { data, error } = await supabase
        .from('sprints')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Check if it's a Cloudflare/Supabase HTML error response
        let errorMessage = error.message || 'Unknown error'
        const isHtmlError = typeof errorMessage === 'string' && 
                           (errorMessage.includes('<html>') || errorMessage.includes('500 Internal Server Error'))
        
        if (isHtmlError) {
          errorMessage = 'Supabase server error (500) - This may be due to data size limits, network issues, or Supabase configuration'
          console.error('Supabase returned HTML error page (likely 500 error from Cloudflare)')
        }

        console.error('Supabase error:', {
          message: errorMessage,
          code: error.code,
          details: error.details,
          hint: error.hint,
          isHtmlError,
        })
        
        // Don't throw - continue and return the sprint plan anyway
        console.warn('Failed to save sprint plan to Supabase, but continuing with response. Sprint plan will still be returned to the user.')
      } else if (data) {
        savedId = data.id
        console.log('Successfully saved sprint plan to Supabase:', savedId)
      }
    } catch (saveError) {
      // Catch any unexpected errors during save
      console.error('Unexpected error saving to Supabase:', saveError)
      // Don't throw - continue and return the sprint plan anyway
    }

    // Return the sprint plan regardless of save success/failure
    return NextResponse.json({
      success: true,
      ...sprintPlan,
      id: savedId,
      saved: savedId !== null,
    })
  } catch (error) {
    console.error('Error generating sprint plan:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}


