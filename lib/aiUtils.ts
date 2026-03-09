/**
 * Shared AI utility functions for all tools
 */

interface AIConfig {
  model: string
  provider: 'perplexity' | 'groq'
}

/**
 * Call AI service based on provider
 */
export async function callAI(
  prompt: string,
  systemPrompt: string,
  config: AIConfig
): Promise<string> {
  if (config.provider === 'perplexity') {
    return await callPerplexityAI(prompt, systemPrompt, config.model)
  }
  
  // Add Groq support later
  throw new Error(`Provider ${config.provider} not yet implemented`)
}

/**
 * Call Perplexity AI
 */
async function callPerplexityAI(
  prompt: string,
  systemPrompt: string,
  model: string
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set in environment variables')
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from Perplexity AI')
  }

  return data.choices[0].message.content
}

/**
 * Determine provider from model name
 */
export function getProviderFromModel(model: string): 'perplexity' | 'groq' {
  if (model.startsWith('sonar') || model.includes('perplexity')) {
    return 'perplexity'
  }
  return 'groq'
}




