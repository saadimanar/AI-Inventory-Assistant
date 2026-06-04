import { type NextRequest, NextResponse } from "next/server"
import {
  SESSION_USER_COOKIE,
  getUserIdFromRequest,
  resolveMockUserId,
} from "@/lib/auth-session"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublicAuth =
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/signup") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/verify-email")

  let userId = getUserIdFromRequest(request)

  if (!userId && !isPublicAuth) {
    userId = resolveMockUserId()
  }

  const response = NextResponse.next({ request })

  if (userId && !request.cookies.get(SESSION_USER_COOKIE)?.value) {
    response.cookies.set(SESSION_USER_COOKIE, userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  }

  if (!userId && !isPublicAuth) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
