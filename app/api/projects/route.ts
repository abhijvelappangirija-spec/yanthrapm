import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user-123' // Default for now

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      projects: data || [],
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
      userId = 'user-123', // Default for now
    } = body

    if (!name || !team_members || !capacity_per_member || !sprint_duration) {
      return NextResponse.json(
        { error: 'Name, team members, capacity per member, and sprint duration are required' },
        { status: 400 }
      )
    }

    const insertData = {
      user_id: userId,
      name,
      description: description || null,
      team_members,
      capacity_per_member,
      sprint_duration,
      tech_stack: tech_stack || null,
      roles: roles && roles.length > 0 ? roles : null,
      resources: resources && resources.length > 0 ? resources : null,
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
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      project: data,
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

