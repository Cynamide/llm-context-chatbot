function cloneMessages(messages) {
  return messages.map((message) => ({
    ...message,
    metrics: message.metrics ? { ...message.metrics } : undefined,
  }))
}

function estimateTokenCount(text) {
  const matches = text.trim().match(/\S+/g)
  return matches ? matches.length : 0
}

function applyAssistantMetrics(message, updates, sampleAt) {
  const metrics = {
    ...(message.metrics ?? {}),
    ...updates,
  }

  if (metrics.startedAt != null && metrics.firstTokenAt != null) {
    metrics.ttftMs = metrics.firstTokenAt - metrics.startedAt
  }

  if (metrics.startedAt != null && metrics.completedAt != null) {
    metrics.totalMs = metrics.completedAt - metrics.startedAt
  }

  const endAt = metrics.completedAt ?? sampleAt

  if (metrics.firstTokenAt != null && endAt != null && metrics.estimatedTokens != null && endAt > metrics.firstTokenAt) {
    const elapsedSeconds = (endAt - metrics.firstTokenAt) / 1000
    metrics.tokensPerSecond = Number((metrics.estimatedTokens / elapsedSeconds).toFixed(1))
  }

  return metrics
}

export function createAssistantPlaceholder(startedAt) {
  return {
    role: "assistant",
    content: "",
    status: "streaming",
    metrics: startedAt == null ? undefined : { startedAt },
  }
}

export function appendAssistantPlaceholder(messages, startedAt) {
  return [...cloneMessages(messages), createAssistantPlaceholder(startedAt)]
}

export function appendAssistantText(messages, chunk, receivedAt = Date.now()) {
  const next = cloneMessages(messages)
  const last = next[next.length - 1]

  if (!last || last.role !== "assistant") {
    return [
      ...next,
      {
        ...createAssistantPlaceholder(receivedAt),
        content: chunk,
        metrics: applyAssistantMetrics(createAssistantPlaceholder(receivedAt), {
          firstTokenAt: receivedAt,
          estimatedTokens: estimateTokenCount(chunk),
        }, receivedAt),
      },
    ]
  }

  last.content = `${last.content}${chunk}`
  last.status = "streaming"
  last.metrics = applyAssistantMetrics(last, {
    firstTokenAt: last.metrics?.firstTokenAt ?? receivedAt,
    estimatedTokens: estimateTokenCount(last.content),
  }, receivedAt)
  return next
}

export function completeAssistantMessage(messages, completedAt = Date.now()) {
  const next = cloneMessages(messages)
  const last = next[next.length - 1]

  if (last && last.role === "assistant") {
    last.status = "done"
    last.metrics = applyAssistantMetrics(last, {
      completedAt,
    }, completedAt)
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
