function cloneMessages(messages) {
  return messages.map((message) => ({ ...message }))
}

export function createAssistantPlaceholder() {
  return { role: "assistant", content: "", status: "streaming" }
}

export function appendAssistantPlaceholder(messages) {
  return [...cloneMessages(messages), createAssistantPlaceholder()]
}

export function appendAssistantText(messages, chunk) {
  const next = cloneMessages(messages)
  const last = next[next.length - 1]

  if (!last || last.role !== "assistant") {
    return [...next, { ...createAssistantPlaceholder(), content: chunk }]
  }

  last.content = `${last.content}${chunk}`
  last.status = "streaming"
  return next
}

export function completeAssistantMessage(messages) {
  const next = cloneMessages(messages)
  const last = next[next.length - 1]

  if (last && last.role === "assistant") {
    last.status = "done"
  }

  return next
}

export function replaceAssistantMessage(messages, content, status = "done") {
  const next = cloneMessages(messages)
  const last = next[next.length - 1]

  if (last && last.role === "assistant") {
    last.content = content
    last.status = status
    return next
  }

  return [...next, { role: "assistant", content, status }]
}

