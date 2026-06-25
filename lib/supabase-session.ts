import { createClient } from "@/utils/supabase/client"

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function signOutSupabase(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
}
