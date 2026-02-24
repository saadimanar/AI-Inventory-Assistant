"use client"

import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "inventory-sidebar-collapsed"

function getStored(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function useSidebarCollapsed() {
  const [isSidebarCollapsed, setSidebarCollapsedState] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSidebarCollapsedState(getStored())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, String(isSidebarCollapsed))
      } catch {
        // ignore
      }
    }
  }, [mounted, isSidebarCollapsed])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => !prev)
  }, [])

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsedState(value)
  }, [])

  return { isSidebarCollapsed, toggleSidebar, setSidebarCollapsed }
}
