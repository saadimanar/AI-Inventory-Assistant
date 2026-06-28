"use client"

import { useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChatSearchResultItem } from "@/lib/chat-search-types"
import type { Folder } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"
import { useChatSearch } from "@/lib/use-chat-search"
import { ChatSearchResultCard } from "./chat-search-result-card"

interface AiSearchPageProps {
  folders: Folder[]
  /** Per-user localStorage namespace; null = guest bucket until auth resolves. */
  userId: string | null
  onSelectItem?: (item: ChatSearchResultItem) => void
}

export function AiSearchPage({
  folders,
  userId,
  onSelectItem,
}: AiSearchPageProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
    clearMessages,
  } = useChatSearch(userId)

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages.length])

  const handleSelectItem = useCallback(
    (item: ChatSearchResultItem) => {
      if (onSelectItem) {
        onSelectItem(item)
      } else {
        router.push(`/?view=all-items&selectedItem=${encodeURIComponent(item.id)}`)
      }
    },
    [onSelectItem, router]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      sendMessage()
    },
    [sendMessage]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  // Auto-resize textarea up to max height
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [])
  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  const composer = (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2"
    >
      <div className="relative flex w-full min-w-0 gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground pointer-events-none" aria-hidden />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={adjustTextareaHeight}
          placeholder="Ask about your inventory..."
          rows={1}
          className={cn(
            "min-h-12 max-h-[200px] w-full resize-none bg-transparent pl-9 pr-2 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            "rounded-lg"
          )}
          disabled={loading}
          aria-label="Message"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0 self-end rounded-lg md:h-10 md:w-10"
          disabled={!input.trim() || loading}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Enter to send, Shift+Enter for new line
      </p>
    </form>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {/* Header */}
      <header
        className={cn(
          "flex min-w-0 shrink-0 items-center justify-between gap-3 border-b border-border bg-[var(--mac-toolbar-bg)] px-4 py-3 md:px-6",
          "backdrop-blur-[var(--mac-blur-sm)]"
        )}
      >
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            Advanced Search
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            Search your inventory in plain language
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 rounded-lg"
          onClick={clearMessages}
        >
          New chat
        </Button>
      </header>

      {messages.length === 0 ? (
        /* Empty state: centered prompt + input */
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6">
          <div className="flex w-full max-w-2xl flex-col items-center gap-6">
            <h2 className="text-center text-xl font-medium text-foreground sm:text-2xl">
              What are you looking for?
            </h2>
            <div className="w-full">
              {composer}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Chat state: scrollable messages */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div
              ref={scrollRef}
              className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6 md:py-8"
            >
              <div className="space-y-8">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex w-full",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full max-w-[85%] rounded-xl px-4 py-3 md:max-w-[720px]",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/80 text-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {m.content}
                      </p>
                      {m.role === "assistant" && m.results && m.results.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {m.results.map((item) => (
                            <ChatSearchResultCard
                              key={item.id}
                              item={item}
                              folders={folders}
                              onSelect={() => handleSelectItem(item)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div
                      className={cn(
                        "flex max-w-[85%] items-center gap-2 rounded-xl bg-muted/80 px-4 py-3 md:max-w-[720px]"
                      )}
                    >
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Searching...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom input */}
          <div
            className={cn(
              "shrink-0 border-t border-border bg-background px-4 py-3 md:px-6",
              "backdrop-blur-[var(--mac-blur-sm)]"
            )}
          >
            <div className="mx-auto w-full max-w-2xl">
              {composer}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
