import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            AI Personal Assistant
          </h1>
          <LogoutButton />
        </div>
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h2 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Welcome back!
          </h2>
          <div className="space-y-2">
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              You are signed in as: <span className="font-medium text-black dark:text-zinc-50">{user.email}</span>
            </p>
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Your account is ready to use. Start building your AI Personal Assistant!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
