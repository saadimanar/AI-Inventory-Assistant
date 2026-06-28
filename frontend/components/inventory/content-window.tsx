"use client"

import { cn } from "@/lib/utils"

interface ContentWindowProps {
  children: React.ReactNode
  className?: string
  /** When true, no inner padding (e.g. for full-bleed list) */
  noPadding?: boolean
}

/**
 * Main content area styled like a macOS window: rounded corners, subtle shadow, elevated background.
 * RTL-safe. Use inside the main column after Toolbar.
 */
export function ContentWindow({ children, className, noPadding }: ContentWindowProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 min-w-0 flex flex-col rounded-xl border border-border bg-card shadow-[var(--mac-shadow-sm)] mac-transition",
        noPadding ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden p-4 sm:p-5 md:p-6",
        className
      )}
    >
      {children}
    </div>
  )
}
