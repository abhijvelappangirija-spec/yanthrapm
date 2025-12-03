import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateBRDWithPerplexity } from '@/lib/perplexity'

export async function POST(request: NextRequest) {
  try {
    const { content, userId } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Generate BRD using Perplexity AI
    const brdText = await generateBRDWithPerplexity(content)

    // Store in Supabase
    const { data, error } = await supabase
      .from('brds')
      .insert({
        user_id: userId || 'anonymous',
        raw_input: content,
        brd_text: brdText,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save BRD', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      brd: brdText,
      id: data.id,
    })
  } catch (error) {
    console.error('Error generating BRD:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}


