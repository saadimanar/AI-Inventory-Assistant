"use client"

import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
  className?: string
}

/**
 * Root layout shell: flex row, full height, no horizontal overflow.
 * Contains Sidebar + main content column. RTL-safe.
 */
export function AppShell({ children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen min-w-0 overflow-x-hidden bg-background",
        className
      )}
    >
      {children}
    </div>
  )
}
