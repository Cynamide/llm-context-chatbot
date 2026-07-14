import test from "node:test"
import assert from "node:assert/strict"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MarkdownMessage } from "./markdown-message.js"

test("MarkdownMessage renders markdown structure instead of plain text", () => {
  const html = renderToStaticMarkup(
    React.createElement(MarkdownMessage, {
      content: "# Hello\n\n- one\n- two\n\n[Docs](https://example.com)\n\n`code`",
    }),
  )

  assert.match(html, /<h1[^>]*>Hello<\/h1>/)
  assert.match(html, /<ul\b/)
  assert.match(html, /<a[^>]*href="https:\/\/example\.com"/)
  assert.match(html, /<code[^>]*>code<\/code>/)
})
