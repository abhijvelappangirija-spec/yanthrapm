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

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)
    const supabase = createActorScopedSupabaseClient(request)

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', actor.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json({
          success: true,
          projects: [],
          storageAvailable: false,
          warning: getPublicServiceErrorMessage('Supabase storage', error),
        })
      }

      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      projects: data || [],
    })
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    console.error('Error fetching projects:', error)

    if (isConnectivityError(error)) {
      return NextResponse.json({
        success: true,
        projects: [],
        storageAvailable: false,
        warning: getPublicServiceErrorMessage('Supabase storage', error),
      })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveRequestActor(request)
    const payload = requireObjectPayload(await request.json())
    const project = parseProjectPayload(payload)
    const supabase = createActorScopedSupabaseClient(request)

    const insertData = {
      user_id: actor.userId,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)

      if (isConnectivityError(error)) {
        return NextResponse.json(
          { error: getPublicServiceErrorMessage('Supabase storage', error) },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
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

    console.error('Error creating project:', error)

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
