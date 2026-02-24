"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Package, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ChatSearchResultItem } from "@/lib/chat-search-types"
import type { Folder } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"

type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; results?: ChatSearchResultItem[]; appliedFilters?: Record<string, unknown> }

interface ChatSearchPanelProps {
  open: boolean
  onClose: () => void
  folders: Folder[]
  onSelectItem?: (item: ChatSearchResultItem) => void
}

export function ChatSearchPanel({
  open,
  onClose,
  folders,
  onSelectItem,
}: ChatSearchPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastAppliedFilters = useRef<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (open && messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [open, messages.length])

  const sendMessage = async () => {
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
          appliedFilters: lastAppliedFilters.current,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: err?.error ?? "Search failed. Please try again.",
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
        { role: "assistant", content: "Something went wrong. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/20 lg:bg-transparent"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full min-w-0 flex-col overflow-x-hidden border-l border-border bg-card shadow-xl",
          "lg:w-[420px]"
        )}
      >
        <div className="flex h-14 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-border px-3 md:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate font-semibold text-foreground">AI Search</span>
          </div>
          <Button variant="ghost" size="icon" className="h-10 min-h-[44px] min-w-[44px] w-10 shrink-0 md:h-8 md:min-h-0 md:min-w-0 md:w-8" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div ref={scrollRef} className="space-y-4 px-4 py-4 pb-6">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Ask in plain language, e.g. &quot;items under $50&quot; or
                &quot;things tagged electronics&quot;.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && m.results && m.results.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.results.map((item) => (
                        <ResultCard
                          key={item.id}
                          item={item}
                          folders={folders}
                          onSelect={() => onSelectItem?.(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-border p-3 md:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex min-w-0 gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search your inventory..."
              className="min-w-0 flex-1"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="min-h-[44px] min-w-[44px] shrink-0 md:h-8 md:w-8 md:min-h-0 md:min-w-0" disabled={loading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}

function ResultCard({
  item,
  folders,
  onSelect,
}: {
  item: ChatSearchResultItem
  folders: Folder[]
  onSelect: () => void
}) {
  const folder = folders.find((f) => f.id === item.folderId)
  const isLowStock = item.quantity <= item.minQuantity

  return (
    <Card
      className="cursor-pointer border-border transition-colors hover:bg-muted/50"
      onClick={onSelect}
    >
      <div className="flex gap-3 p-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardContent className="min-w-0 flex-1 p-0">
          <p className="truncate font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.sku}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">
              ${item.price.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              Qty: {item.quantity}
            </span>
            {isLowStock && (
              <Badge variant="destructive" className="text-xs">
                Low stock
              </Badge>
            )}
            {folder && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.name}
              </span>
            )}
          </div>
          {item.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
