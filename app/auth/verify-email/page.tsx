export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-black dark:text-zinc-50">
            Check your email
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            We've sent you a confirmation link. Please check your email and click the link to verify your account.
          </p>
        </div>
      </div>
    </div>
  )
}
