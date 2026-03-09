import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { callAI, getProviderFromModel } from '@/lib/aiUtils'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { content, model, systemPrompt, toolType, userId } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!systemPrompt || !toolType) {
      return NextResponse.json(
        { error: 'System prompt and tool type are required' },
        { status: 400 }
      )
    }

    const provider = getProviderFromModel(model || 'sonar-pro')
    
    // Generate output using AI
    const output = await callAI(content, systemPrompt, {
      model: model || 'sonar-pro',
      provider,
    })

    // Store in Supabase
    const { data, error } = await supabase
      .from('tool_outputs')
      .insert({
        user_id: userId || session.user.email || 'anonymous',
        tool_type: toolType,
        raw_input: content,
        output: output,
        model_used: model || 'sonar-pro',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      // Don't fail the request if storage fails, just log it
      console.warn('Failed to save output to database, but generation succeeded')
    }

    return NextResponse.json({
      success: true,
      output,
      id: data?.id || null,
    })
  } catch (error) {
    console.error('Error generating tool output:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

