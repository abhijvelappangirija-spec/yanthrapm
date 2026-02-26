import { NextRequest, NextResponse } from 'next/server'
import { generateBRDFromFile } from '@/lib/perplexity'

export async function POST(request: NextRequest) {
  try {
    const { fileContent, useDummyData } = await request.json()

    if (!fileContent) {
      return NextResponse.json(
        { error: 'File content is required' },
        { status: 400 }
      )
    }

    // Generate improved BRD using Perplexity AI or dummy data
    let brdText: string
    if (useDummyData) {
      const { generateDummyBRD } = await import('@/lib/perplexity')
      brdText = generateDummyBRD(fileContent)
      console.log('Using dummy BRD data for testing')
    } else {
      brdText = await generateBRDFromFile(fileContent)
    }

    return NextResponse.json({
      success: true,
      brd: brdText,
    })
  } catch (error) {
    console.error('Error generating BRD from file:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

