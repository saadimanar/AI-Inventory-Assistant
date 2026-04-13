"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { ChatSearchResultItem } from "@/lib/chat-search-types"
import type { ExtractedFilters } from "@/lib/chat-search-types"

const CHAT_SEARCH_PREFIX = "inventory-ai-search-messages:"

export function getChatSearchStorageKey(userId: string | null): string {
  if (userId) return `${CHAT_SEARCH_PREFIX}${userId}`
  return `${CHAT_SEARCH_PREFIX}guest`
}

/** Removes guest bucket and the given user's key. */
export function clearChatSearchStorageForSignOut(userId: string | null) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(getChatSearchStorageKey(null))
    if (userId) localStorage.removeItem(getChatSearchStorageKey(userId))
  } catch {
    // ignore
  }
}

export type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant"
      content: string
      results?: ChatSearchResultItem[]
      appliedFilters?: Record<string, unknown>
    }

function loadPersistedMessages(storageKey: string): ChatMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as ChatMessage[]
  } catch {
    return []
  }
}

function saveMessages(storageKey: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages))
  } catch {
    // ignore
  }
}

export function useChatSearch(userId: string | null) {
  const storageKey = getChatSearchStorageKey(userId)
  const storageKeyRef = useRef(storageKey)
  storageKeyRef.current = storageKey

  const skipNextPersist = useRef(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const lastAppliedFilters = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    skipNextPersist.current = true
    setMessages(loadPersistedMessages(storageKey))
    lastAppliedFilters.current = null
  }, [storageKey])

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false
      return
    }
    saveMessages(storageKeyRef.current, messages)
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setLoading(true)

    try {
      const res = await fetch("/api/chat/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          appliedFilters: lastAppliedFilters.current as ExtractedFilters | null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: (err?.error as string) ?? "Search failed. Please try again.",
          },
        ])
        return
      }

      const data = await res.json()

      if (data.type === "clarify") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.question },
        ])
        return
      }

      if (data.type === "answer") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ])
        return
      }

      if (data.type === "results") {
        lastAppliedFilters.current = data.appliedFilters ?? null
        const itemCount = data.items?.length ?? 0
        const summary =
          itemCount === 0
            ? "No items match."
            : `Found ${itemCount} item${itemCount === 1 ? "" : "s"}.`
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: summary,
            results: data.items,
            appliedFilters: data.appliedFilters,
          },
        ])
      }
    } catch (e) {
      console.error(e)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  const clearMessages = useCallback(() => {
    setMessages([])
    lastAppliedFilters.current = null
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKeyRef.current)
      } catch {
        // ignore
      }
    }
  }, [])

  return {
    messages,
    setMessages,
    input,
    setInput,
    loading,
    sendMessage,
    clearMessages,
  }
}
