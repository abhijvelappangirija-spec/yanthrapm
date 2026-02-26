import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { brdId: string } }
) {
  try {
    const { brdId } = params

    const { data, error } = await supabase
      .from('technical_context')
      .select('*')
      .eq('brd_id', brdId)
      .single()

    if (error) {
      // If not found, that's okay - technical context is optional
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          technicalContext: null,
        })
      }
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch technical context', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      technicalContext: data?.technical_context || null,
    })
  } catch (error) {
    console.error('Error fetching technical context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

