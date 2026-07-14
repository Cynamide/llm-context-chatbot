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
