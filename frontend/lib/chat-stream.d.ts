export type ChatRole = "user" | "assistant"
export type ChatMessageStatus = "streaming" | "done"

export interface ChatMessage {
  role: ChatRole
  content: string
  status?: ChatMessageStatus
}

export function createAssistantPlaceholder(): ChatMessage
export function appendAssistantPlaceholder(messages: ChatMessage[]): ChatMessage[]
export function appendAssistantText(
  messages: ChatMessage[],
  chunk: string,
): ChatMessage[]
export function completeAssistantMessage(messages: ChatMessage[]): ChatMessage[]
export function replaceAssistantMessage(
  messages: ChatMessage[],
  content: string,
  status?: ChatMessageStatus,
): ChatMessage[]

