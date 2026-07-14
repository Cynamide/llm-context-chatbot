import test from "node:test"
import assert from "node:assert/strict"
import {
  appendAssistantPlaceholder,
  appendAssistantText,
  completeAssistantMessage,
} from "./chat-stream.js"

test("chat stream helpers append and update a single assistant placeholder", () => {
  const withPlaceholder = appendAssistantPlaceholder([{ role: "user", content: "Hi" }])
  assert.equal(withPlaceholder.length, 2)
  assert.equal(withPlaceholder[1].role, "assistant")
  assert.equal(withPlaceholder[1].status, "streaming")
  assert.equal(withPlaceholder[1].content, "")

  const withChunk = appendAssistantText(withPlaceholder, "Hello")
  assert.equal(withChunk[1].content, "Hello")
  assert.equal(withChunk[1].status, "streaming")

  const done = completeAssistantMessage(withChunk)
  assert.equal(done[1].status, "done")
})

test("chat stream helpers track assistant timing metrics", () => {
  const startedAt = 1_000
  const firstTokenAt = 1_260
  const completedAt = 2_260

  const withPlaceholder = appendAssistantPlaceholder([{ role: "user", content: "Hi" }], startedAt)
  assert.equal(withPlaceholder[1].metrics.startedAt, startedAt)

  const withChunk = appendAssistantText(withPlaceholder, "Hello world", firstTokenAt)
  assert.equal(withChunk[1].metrics.firstTokenAt, firstTokenAt)
  assert.equal(withChunk[1].metrics.ttftMs, 260)

  const done = completeAssistantMessage(withChunk, completedAt)
  assert.equal(done[1].metrics.completedAt, completedAt)
  assert.equal(done[1].metrics.totalMs, 1_260)
  assert.equal(done[1].metrics.tokensPerSecond, 2)
})
