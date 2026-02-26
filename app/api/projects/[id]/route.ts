import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch project', details: error.message },
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
    console.error('Error fetching project:', error)
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
    const body = await request.json()
    const {
      name,
      description,
      team_members,
      capacity_per_member,
      sprint_duration,
      tech_stack,
      roles,
      resources,
    } = body

    if (!name || !team_members || !capacity_per_member || !sprint_duration) {
      return NextResponse.json(
        { error: 'Name, team members, capacity per member, and sprint duration are required' },
        { status: 400 }
      )
    }

    const updateData = {
      name,
      description: description || null,
      team_members,
      capacity_per_member,
      sprint_duration,
      tech_stack: tech_stack || null,
      roles: roles && roles.length > 0 ? roles : null,
      resources: resources && resources.length > 0 ? resources : null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update project', details: error.message },
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
    console.error('Error updating project:', error)
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

    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

