import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, brd_text } = await request.json()

    if (!id || !brd_text) {
      return NextResponse.json(
        { error: 'ID and BRD text are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('brds')
      .update({ brd_text })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update BRD', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      brd: data,
    })
  } catch (error) {
    console.error('Error updating BRD:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



