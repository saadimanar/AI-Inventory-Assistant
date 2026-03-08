"use client"

import { useRef, useEffect } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChatSearchResultItem } from "@/lib/chat-search-types"
import type { Folder } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"
import { useChatSearch } from "@/lib/use-chat-search"
import { ChatSearchResultCard } from "./chat-search-result-card"

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
  const { messages, input, setInput, loading, sendMessage } = useChatSearch()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [open, messages.length])

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
            <span className="truncate font-semibold text-foreground">Advanced Search</span>
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
                        <ChatSearchResultCard
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
