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

    // Generate sprint plan using Perplexity AI
    const sprintPlan = await generateSprintPlanWithPerplexity(
      brdText,
      teamMembers,
      capacityPerMember,
      sprintDuration,
      velocity
    )

    // Store in Supabase
    const { data, error } = await supabase
      .from('sprints')
      .insert({
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
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save sprint plan', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...sprintPlan,
      id: data.id,
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


