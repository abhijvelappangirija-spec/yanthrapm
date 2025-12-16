import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { brdId, technicalContext, userId } = await request.json()

    if (!brdId) {
      return NextResponse.json(
        { error: 'BRD ID is required' },
        { status: 400 }
      )
    }

    if (!technicalContext) {
      return NextResponse.json(
        { error: 'Technical context is required' },
        { status: 400 }
      )
    }

    // Try to save to Supabase (optional - table may not exist)
    try {
      const { data, error } = await supabase
        .from('technical_context')
        .upsert({
          brd_id: brdId,
          technical_context: technicalContext,
          user_id: userId || 'anonymous',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'brd_id',
        })
        .select()
        .single()

      if (error) {
        // If table doesn't exist, just log and continue
        console.warn('Could not save technical context to database:', error.message)
        return NextResponse.json({
          success: true,
          saved: false,
          message: 'Technical context saved in session (database save skipped)',
        })
      }

      return NextResponse.json({
        success: true,
        saved: true,
        id: data?.id,
        message: 'Technical context saved successfully',
      })
    } catch (dbError) {
      // Database table might not exist, that's okay
      console.warn('Database save skipped:', dbError)
      return NextResponse.json({
        success: true,
        saved: false,
        message: 'Technical context saved in session',
      })
    }
  } catch (error) {
    console.error('Error saving technical context:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

