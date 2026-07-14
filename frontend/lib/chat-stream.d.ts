export type ChatRole = "user" | "assistant"
export type ChatMessageStatus = "streaming" | "done"

export interface ChatMessageMetrics {
  startedAt?: number
  firstTokenAt?: number
  completedAt?: number
  ttftMs?: number
  totalMs?: number
  estimatedTokens?: number
  tokensPerSecond?: number
}

export interface ChatMessage {
  role: ChatRole
  content: string
  status?: ChatMessageStatus
  metrics?: ChatMessageMetrics
}

export function createAssistantPlaceholder(startedAt?: number): ChatMessage
export function appendAssistantPlaceholder(messages: ChatMessage[], startedAt?: number): ChatMessage[]
export function appendAssistantText(
  messages: ChatMessage[],
  chunk: string,
  receivedAt?: number,
): ChatMessage[]
export function completeAssistantMessage(messages: ChatMessage[], completedAt?: number): ChatMessage[]
export function replaceAssistantMessage(
  messages: ChatMessage[],
  content: string,
  status?: ChatMessageStatus,
): ChatMessage[]
