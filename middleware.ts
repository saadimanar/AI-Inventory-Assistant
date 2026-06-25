import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

function allowMockAuth(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_MOCK_AUTH === "true"
}

function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

export async function middleware(request: NextRequest) {
  if (allowMockAuth() || !hasSupabaseConfig()) {
    return NextResponse.next()
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
