"use server"

import { cookies } from "next/headers"
import { SESSION_USER_COOKIE, AUTH_TOKEN_COOKIE } from "@/lib/auth-session"

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_USER_COOKIE)
  cookieStore.delete(AUTH_TOKEN_COOKIE)
}
