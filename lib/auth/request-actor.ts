import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getPublicServiceErrorMessage, isConnectivityError } from '@/lib/service-errors'

const FALLBACK_DEVELOPMENT_USER_ID = 'user-123'

export class ActorResolutionError extends Error {
  status: number

  constructor(message: string, status: number = 401) {
    super(message)
    this.name = 'ActorResolutionError'
    this.status = status
  }
}

export type RequestActor = {
  userId: string
  source: 'supabase-auth' | 'configured-default' | 'development-fallback'
}

function isTruthyEnvFlag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())
}

function isFallbackActorExplicitlyAllowed(): boolean {
  return isTruthyEnvFlag(process.env.APP_ALLOW_FALLBACK_ACTOR)
}

function canUseFallbackActor(): boolean {
  if (isFallbackActorExplicitlyAllowed()) {
    return true
  }

  return process.env.NODE_ENV !== 'production'
}

function normalizeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isJwtLike(value: string): boolean {
  return value.split('.').length === 3
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function tryDecodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
    return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
  } catch {
    return null
  }
}

function extractTokenFromParsedValue(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return isJwtLike(value) ? value : null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedToken = extractTokenFromParsedValue(item)
      if (nestedToken) {
        return nestedToken
      }
    }

    return null
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const currentSession =
      record.currentSession && typeof record.currentSession === 'object'
        ? (record.currentSession as Record<string, unknown>)
        : null
    const accessToken =
      record.access_token ||
      record.accessToken ||
      record.token ||
      currentSession?.access_token

    if (typeof accessToken === 'string' && isJwtLike(accessToken)) {
      return accessToken
    }
  }

  return null
}

function extractAccessTokenFromCookieValue(rawValue: string): string | null {
  const normalizedValue = normalizeCookieValue(rawValue)

  if (isJwtLike(normalizedValue)) {
    return normalizedValue
  }

  const parsedJsonToken = extractTokenFromParsedValue(tryParseJson(normalizedValue))
  if (parsedJsonToken) {
    return parsedJsonToken
  }

  const decodedBase64 = tryDecodeBase64Url(normalizedValue)
  if (decodedBase64) {
    if (isJwtLike(decodedBase64)) {
      return decodedBase64
    }

    const parsedBase64Token = extractTokenFromParsedValue(tryParseJson(decodedBase64))
    if (parsedBase64Token) {
      return parsedBase64Token
    }
  }

  return null
}

function getCookieTokenCandidates(request: NextRequest): string[] {
  const exactCookieNames = new Set(['sb-access-token', 'supabase-access-token'])
  const chunkedValues = new Map<string, Array<{ index: number; value: string }>>()
  const directValues: string[] = []

  for (const cookie of request.cookies.getAll()) {
    if (exactCookieNames.has(cookie.name)) {
      directValues.push(cookie.value)
      continue
    }

    const chunkMatch = cookie.name.match(/^(sb-[^.]+-auth-token)(?:\.(\d+))?$/)
    if (chunkMatch) {
      const baseName = chunkMatch[1]
      const index = chunkMatch[2] ? Number(chunkMatch[2]) : 0
      const current = chunkedValues.get(baseName) || []
      current.push({ index, value: cookie.value })
      chunkedValues.set(baseName, current)
      continue
    }

    if (cookie.name.endsWith('-auth-token') || cookie.name.endsWith('-access-token')) {
      directValues.push(cookie.value)
    }
  }

  const reconstructedValues = Array.from(chunkedValues.values()).map((parts) =>
    parts
      .sort((a, b) => a.index - b.index)
      .map((part) => part.value)
      .join('')
  )

  return [...directValues, ...reconstructedValues]
}

export function getRequestAccessToken(request: NextRequest): string | null {
  const authorizationHeader = request.headers.get('authorization')

  if (authorizationHeader?.toLowerCase().startsWith('bearer ')) {
    return authorizationHeader.slice(7).trim() || null
  }

  for (const candidate of getCookieTokenCandidates(request)) {
    const token = extractAccessTokenFromCookieValue(candidate)
    if (token) {
      return token
    }
  }

  return null
}

async function resolveUserFromSupabaseToken(
  request: NextRequest
): Promise<RequestActor | null> {
  const accessToken = getRequestAccessToken(request)

  if (!accessToken) {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ActorResolutionError('Supabase authentication is not configured.', 503)
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await authClient.auth.getUser(accessToken)

  if (error) {
    if (isConnectivityError(error)) {
      throw new ActorResolutionError(
        getPublicServiceErrorMessage('Supabase authentication', error),
        503
      )
    }

    throw new ActorResolutionError('Authentication failed.', 401)
  }

  if (!data.user?.id) {
    throw new ActorResolutionError('Authentication required.', 401)
  }

  return {
    userId: data.user.id,
    source: 'supabase-auth',
  }
}

function getConfiguredFallbackUserId(): string | null {
  if (!canUseFallbackActor()) {
    return null
  }

  const configuredUserId =
    process.env.APP_DEFAULT_USER_ID || process.env.DEMO_USER_ID || process.env.DEFAULT_USER_ID

  return configuredUserId?.trim() || null
}

export async function resolveRequestActor(
  request: NextRequest
): Promise<RequestActor> {
  const authenticatedActor = await resolveUserFromSupabaseToken(request)

  if (authenticatedActor) {
    return authenticatedActor
  }

  const configuredUserId = getConfiguredFallbackUserId()

  if (configuredUserId) {
    return {
      userId: configuredUserId,
      source: 'configured-default',
    }
  }

  if (canUseFallbackActor()) {
    return {
      userId: FALLBACK_DEVELOPMENT_USER_ID,
      source: 'development-fallback',
    }
  }

  throw new ActorResolutionError(
    'Authentication is required for this environment.',
    401
  )
}
