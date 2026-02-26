import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'user-123' // Default for now

    const { data, error } = await supabase
      .from('brds')
      .select('id, user_id, raw_input, brd_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch BRDs', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      brds: data || [],
    })
  } catch (error) {
    console.error('Error fetching BRDs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

