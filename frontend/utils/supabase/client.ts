import { createBrowserClient } from '@supabase/ssr'

const MOCK_SUPABASE_URL = 'http://127.0.0.1:54321'
const MOCK_SUPABASE_ANON_KEY = 'mock-anon-key'

function resolveSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (url && anonKey) {
    return { url, anonKey }
  }

  if (process.env.NEXT_PUBLIC_ALLOW_MOCK_AUTH === 'true') {
    return { url: MOCK_SUPABASE_URL, anonKey: MOCK_SUPABASE_ANON_KEY }
  }

  throw new Error(
    '@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!'
  )
}

export function createClient() {
  const { url, anonKey } = resolveSupabaseConfig()
  return createBrowserClient(url, anonKey)
}
