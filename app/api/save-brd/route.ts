import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { raw_input, brd_text, userId } = await request.json()

    if (!brd_text) {
      return NextResponse.json(
        { error: 'BRD text is required' },
        { status: 400 }
      )
    }

    // Save the BRD directly to Supabase
    const { data, error } = await supabase
      .from('brds')
      .insert({
        user_id: userId || 'anonymous',
        raw_input: raw_input || brd_text.substring(0, 500), // Use first 500 chars as raw input if not provided
        brd_text: brd_text,
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
      id: data.id,
      brd: data,
    })
  } catch (error) {
    console.error('Error saving BRD:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

