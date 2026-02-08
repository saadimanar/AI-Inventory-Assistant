"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getCurrentUserDisplayName } from "@/lib/inventory-store"

export default function SetupPage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUserDisplayName().then(setUserName)
  }, [])

  const displayName = userName?.trim() || "there"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border-0 bg-card shadow-xl sm:max-w-[420px]">
        <div className="relative p-6 pb-4 pt-8">
          {/* Close button (top-right) */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Close"
          >
            <span className="text-2xl leading-none text-muted-foreground">×</span>
          </button>

          {/* Illustration: folder hierarchy + laptop (dashed lines like reference) */}
          <div className="mb-6 flex justify-center">
            <svg
              viewBox="0 0 200 120"
              className="h-28 w-full max-w-[260px] text-foreground"
              aria-hidden
            >
              {/* Main folder (top) */}
              <path
                d="M100 8 L100 28 L75 28 L65 22 L65 8 Z M100 28 L125 28 L135 22 L135 8 L100 8"
                fill="currentColor"
                className="opacity-90"
              />
              <path d="M70 22 L130 22" stroke="currentColor" strokeWidth="1.5" fill="none" className="opacity-70" />
              {/* Dashed branch to child folders */}
              <path
                d="M100 28 L70 45 M100 28 L100 45 M100 28 L130 45 M100 28 L165 45"
                stroke="currentColor"
                strokeWidth="1.2"
                fill="none"
                strokeDasharray="4 3"
                className="opacity-50"
              />
              {/* Child folders */}
              <path d="M55 45 L55 62 L45 58 L45 45 Z" fill="currentColor" className="opacity-85" />
              <path d="M92 45 L92 62 L82 58 L82 45 Z" fill="currentColor" className="opacity-85" />
              <path d="M128 45 L128 62 L118 58 L118 45 Z" fill="currentColor" className="opacity-85" />
              {/* Gray folders */}
              <path d="M148 45 L148 62 L138 58 L138 45 Z" fill="var(--muted-foreground)" className="opacity-60" />
              <path d="M165 45 L165 62 L155 58 L155 45 Z" fill="var(--muted-foreground)" className="opacity-60" />
              {/* Laptop (right) */}
              <rect x="75" y="75" width="50" height="32" rx="2" fill="var(--muted-foreground)" className="opacity-40" />
              <rect x="78" y="78" width="44" height="26" rx="1" fill="var(--background)" className="opacity-90" />
              <rect x="88" y="85" width="10" height="10" fill="currentColor" className="opacity-90" />
              <rect x="100" y="85" width="10" height="10" fill="currentColor" className="opacity-90" />
              <rect x="112" y="85" width="10" height="10" fill="currentColor" className="opacity-90" />
            </svg>
          </div>

          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hello {displayName}! 👋
            </h1>
            <p className="text-lg font-semibold text-foreground">
              Organize like never before with Inventory
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create flexible folders that match how you think—nest subfolders, track
              items, and set alerts effortlessly. Let&apos;s set up your workspace in
              under 3 minutes.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-5">
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-foreground font-semibold uppercase tracking-wide text-background hover:bg-foreground/90"
          >
            Start Setup
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="w-full font-semibold uppercase tracking-wide text-foreground hover:bg-muted hover:text-foreground"
          >
            Explore On My Own
          </Button>
        </div>
      </div>
    </div>
  )
}
