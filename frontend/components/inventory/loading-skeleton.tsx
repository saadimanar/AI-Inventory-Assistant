"use client"

import { AppShell } from "./app-shell"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * macOS-style loading state: shell with sidebar + content skeleton.
 */
export function LoadingSkeleton() {
  return (
    <AppShell>
      {/* Sidebar skeleton */}
      <aside className="fixed start-0 inset-y-0 z-40 hidden w-64 flex-col border-e border-border bg-sidebar lg:flex">
        <div className="flex h-[52px] items-center gap-2 border-b border-border px-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:ms-64 lg:pt-0">
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--mac-shadow-sm)]">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </main>
    </AppShell>
  )
}
