"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const ONBOARDING_STORAGE_KEY = "inventory_onboarding_completed"

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
}

export function setOnboardingCompleted(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
}

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartSetup?: () => void
  onExploreOnMyOwn?: () => void
}

export function OnboardingModal({
  open,
  onOpenChange,
  onStartSetup,
  onExploreOnMyOwn,
}: OnboardingModalProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next) setOnboardingCompleted()
    onOpenChange(next)
  }

  const handleStartSetup = () => {
    setOnboardingCompleted()
    onStartSetup?.()
    onOpenChange(false)
  }

  const handleExploreOnMyOwn = () => {
    setOnboardingCompleted()
    onExploreOnMyOwn?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="max-w-md rounded-xl border-0 bg-card p-0 shadow-xl sm:max-w-[420px]"
      >
        <div className="p-6 pb-4 pt-8">
          {/* Illustration: folder hierarchy + laptop with items */}
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
              {/* Branch to child folders */}
              <path d="M100 28 L70 45 M100 28 L100 45 M100 28 L130 45" stroke="currentColor" strokeWidth="1.2" fill="none" className="opacity-50" />
              {/* Child folders */}
              <path d="M55 45 L55 62 L45 58 L45 45 Z" fill="currentColor" className="opacity-85" />
              <path d="M92 45 L92 62 L82 58 L82 45 Z" fill="currentColor" className="opacity-85" />
              <path d="M128 45 L128 62 L118 58 L118 45 Z" fill="currentColor" className="opacity-85" />
              {/* Gray folder */}
              <path d="M165 45 L165 62 L155 58 L155 45 Z" fill="var(--muted-foreground)" className="opacity-60" />
              {/* Laptop base */}
              <rect x="75" y="75" width="50" height="32" rx="2" fill="var(--muted-foreground)" className="opacity-40" />
              <rect x="78" y="78" width="44" height="26" rx="1" fill="var(--background)" className="opacity-90" />
              {/* Cubes/items on laptop screen */}
              <rect x="88" y="85" width="10" height="10" fill="currentColor" className="opacity-90" />
              <rect x="100" y="85" width="10" height="10" fill="currentColor" className="opacity-90" />
              <rect x="112" y="85" width="10" height="10" fill="currentColor" className="opacity-90" />
            </svg>
          </div>

          <DialogHeader className="space-y-3 text-center">
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Hello 👋
            </DialogTitle>
            <p className="text-lg font-semibold text-foreground">
              Organize like never before with Inventory
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Create flexible folders that match how you think—nest subfolders, track
              items, and set alerts effortlessly. Let&apos;s set up your workspace in
              under 3 minutes.
            </p>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-5">
          <Button
            onClick={handleStartSetup}
            className="w-full bg-foreground font-semibold uppercase tracking-wide text-background hover:bg-foreground/90"
          >
            Start Setup
          </Button>
          <Button
            variant="outline"
            onClick={handleExploreOnMyOwn}
            className="w-full border-foreground font-semibold uppercase tracking-wide text-foreground hover:bg-muted hover:text-foreground"
          >
            Explore On My Own
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
