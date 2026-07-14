"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, Bot, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  appendAssistantPlaceholder,
  appendAssistantText,
  completeAssistantMessage,
  replaceAssistantMessage,
} from "@/lib/chat-stream"

interface Message {
  role: "user" | "assistant"
  content: string
  status?: "streaming" | "done"
  metrics?: {
    startedAt?: number
    firstTokenAt?: number
    completedAt?: number
    ttftMs?: number
    totalMs?: number
    estimatedTokens?: number
    tokensPerSecond?: number
  }
}

function formatDuration(ms?: number) {
  if (ms == null) return null

  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  const seconds = ms / 1000
  return `${seconds >= 10 ? seconds.toFixed(1) : seconds.toFixed(2)}s`
}

function formatTokensPerSecond(value?: number) {
  if (value == null || Number.isNaN(value)) return null
  return `${value.toFixed(value >= 10 ? 0 : 1)} tok/s`
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const startedAt = performance.now()
    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => appendAssistantPlaceholder([...prev, userMessage], startedAt))
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      const processEvent = (event: string) => {
        const lines = event.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue

          const data = line.slice(6)
          if (data === "[DONE]") {
            continue
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.response) {
              setMessages((prev) => appendAssistantText(prev, parsed.response, performance.now()))
            }
          } catch {
            // Skip malformed chunks and keep streaming.
          }
        }
      }

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const events = buffer.split("\n\n")
          buffer = events.pop() ?? ""

          for (const event of events) {
            processEvent(event)
          }
        }
      }

      if (buffer.trim()) {
        processEvent(buffer)
      }

      setMessages((prev) => completeAssistantMessage(prev, performance.now()))
    } catch (error) {
      setMessages((prev) =>
        replaceAssistantMessage(prev, "Sorry, I encountered an error. Please try again.", "done"),
      )
      toast({
        title: "Chat failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="border-b border-border p-4">
        <h1 className="text-xl font-semibold text-foreground">RAG Assistant</h1>
        <p className="text-sm text-muted-foreground">Ask questions about your knowledge base</p>
      </header>

      <ScrollArea className="flex-1 p-4 overflow-auto" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Bot className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Start a conversation</h2>
                <p className="text-sm text-muted-foreground">Upload knowledge files and ask me anything</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border"
                  }`}
                >
                  {message.role === "assistant" && message.status === "streaming" && message.content.length === 0 ? (
                    <div className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
                      <span className="sr-only">Assistant is typing</span>
                      {["0", "1", "2", "3"].map((dot, index) => (
                        <span
                          key={dot}
                          className="inline-block text-base leading-none animate-pulse"
                          style={{ animationDelay: `${index * 140}ms` }}
                        >
                          .
                        </span>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      {message.role === "assistant" && message.metrics ? (
                        <div className="mt-2 flex flex-wrap gap-2 border-t border-border/60 pt-2 text-[11px] leading-none text-muted-foreground/80">
                          {message.metrics.ttftMs != null ? (
                            <span className="rounded-full bg-muted/60 px-2 py-1">
                              TTFT {formatDuration(message.metrics.ttftMs)}
                            </span>
                          ) : null}
                          {message.metrics.tokensPerSecond != null ? (
                            <span className="rounded-full bg-muted/60 px-2 py-1">
                              {formatTokensPerSecond(message.metrics.tokensPerSecond)}
                            </span>
                          ) : null}
                          {message.metrics.totalMs != null ? (
                            <span className="rounded-full bg-muted/60 px-2 py-1">
                              Total {formatDuration(message.metrics.totalMs)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your knowledge base..."
              rows={1}
              className="resize-none bg-card border-border text-foreground min-h-[44px] max-h-[200px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-[44px] w-[44px] flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Press Enter to send, Shift+Enter for new line</p>
        </form>
      </div>
    </div>
  )
}
