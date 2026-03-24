import { NextRequest, NextResponse } from 'next/server'

import { ActorResolutionError, resolveRequestActor } from '@/lib/auth/request-actor'
import { parseProjectPayload } from '@/lib/project-payload'
import {
  RequestValidationError,
  requireObjectPayload,
} from '@/lib/security/request-validation'
import {
  getPublicServiceErrorMessage,
  isConnectivityError,
} from '@/lib/service-errors'
import { createActorScopedSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const actor = await resolveRequestActor(request)
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', actor.userId)
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json(
          { error: getPublicServiceErrorMessage('Supabase storage', error) },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project: data,
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching project:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        { error: getPublicServiceErrorMessage('Supabase storage', error) },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const actor = await resolveRequestActor(request)
    const payload = requireObjectPayload(await request.json())
    const project = parseProjectPayload(payload)
    const supabase = createActorScopedSupabaseClient(request)

    const updateData = {
      name: project.name,
      description: project.description || null,
      team_members: project.team_members,
      capacity_per_member: project.capacity_per_member,
      sprint_duration: project.sprint_duration,
      tech_stack: project.tech_stack || null,
      roles: project.roles && project.roles.length > 0 ? project.roles : null,
      resources:
        project.resources && project.resources.length > 0
          ? project.resources
          : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', actor.userId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json(
          { error: getPublicServiceErrorMessage('Supabase storage', error) },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project: data,
    })
  } catch (error) {
    if (
      error instanceof ActorResolutionError ||
      error instanceof RequestValidationError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error updating project:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        { error: getPublicServiceErrorMessage('Supabase storage', error) },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const actor = await resolveRequestActor(request)
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', actor.userId)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json(
          { error: getPublicServiceErrorMessage('Supabase storage', error) },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error deleting project:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json(
        { error: getPublicServiceErrorMessage('Supabase storage', error) },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
