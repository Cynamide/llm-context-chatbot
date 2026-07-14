import test from "node:test"
import assert from "node:assert/strict"
import { shouldRefreshKnowledgeFiles } from "./knowledge-refresh.js"

test("refreshes when the knowledge tab becomes visible", () => {
  assert.equal(
    shouldRefreshKnowledgeFiles({
      isVisible: true,
      previousIsVisible: false,
      refreshToken: 0,
      lastLoadedToken: null,
    }),
    true,
  )
})

test("does not refresh while hidden", () => {
  assert.equal(
    shouldRefreshKnowledgeFiles({
      isVisible: false,
      previousIsVisible: true,
      refreshToken: 1,
      lastLoadedToken: 1,
    }),
    false,
  )
})

test("refreshes after a successful upload while visible", () => {
  assert.equal(
    shouldRefreshKnowledgeFiles({
      isVisible: true,
      previousIsVisible: true,
      refreshToken: 2,
      lastLoadedToken: 1,
    }),
    true,
  )
})
