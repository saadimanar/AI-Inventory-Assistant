import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

/** Cookie set by proxy / login placeholder for the authenticated user id. */
export const SESSION_USER_COOKIE = "app_user_id"

/** Legacy / generic token cookie name (value treated as user id when present). */
export const AUTH_TOKEN_COOKIE = "auth_token"

const DEFAULT_MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"

export function resolveMockUserId(): string {
  return (
    process.env.MOCK_USER_ID?.trim() ||
    process.env.DEFAULT_USER_ID?.trim() ||
    DEFAULT_MOCK_USER_ID
  )
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const fromSession = request.cookies.get(SESSION_USER_COOKIE)?.value?.trim()
  if (fromSession) return fromSession

  const fromToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value?.trim()
  if (fromToken) return fromToken

  return null
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const fromSession = cookieStore.get(SESSION_USER_COOKIE)?.value?.trim()
  if (fromSession) return fromSession

  const fromToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value?.trim()
  if (fromToken) return fromToken

  return null
}

/** Server-side gatekeeper: never trust client-supplied user ids for authorization. */
export async function requireSessionUserId(): Promise<string> {
  const userId = (await getSessionUserId()) ?? resolveMockUserId()
  if (!userId) {
    throw new Error("User not authenticated")
  }
  return userId
}

export async function getSessionUserDisplayName(): Promise<string> {
  const configured = process.env.MOCK_USER_DISPLAY_NAME?.trim()
  if (configured) return configured
  const userId = await getSessionUserId()
  if (!userId) return "User"
  return `User ${userId.slice(0, 8)}`
}
