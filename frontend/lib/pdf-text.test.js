import test from "node:test"
import assert from "node:assert/strict"
import zlib from "node:zlib"
import { extractPdfTextFromBytes } from "./pdf-text.js"

function buildSinglePagePdf(text, { compressed = false } = {}) {
  const stream = Buffer.from(`BT
/F1 12 Tf
72 720 Td
(${text}) Tj
ET`)
  const contents = compressed ? zlib.deflateSync(stream) : stream
  const pdfChunks = []
  const offsets = [0]

  const push = (chunk) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    const currentLength = pdfChunks.reduce((total, part) => total + part.length, 0)
    offsets.push(currentLength)
    pdfChunks.push(buffer)
  }

  push(`%PDF-1.4\n`)
  push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`)
  push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`)
  push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)
  push(`5 0 obj\n<< /Length ${contents.length}${compressed ? " /Filter /FlateDecode" : ""} >>\nstream\n`)
  pdfChunks.push(contents)
  push(`\nendstream\nendobj\n`)

  const xrefOffset = pdfChunks.reduce((total, part) => total + part.length, 0)
  let xref = `xref\n0 6\n0000000000 65535 f \n`
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  pdfChunks.push(Buffer.from(xref))

  return Buffer.concat(pdfChunks)
}

test("extractPdfTextFromBytes pulls literal text from a simple PDF stream", async () => {
  const pdf = buildSinglePagePdf("Hello PDF")

  await assert.doesNotReject(async () => {
    assert.equal(await extractPdfTextFromBytes(pdf), "Hello PDF")
  })
})

test("extractPdfTextFromBytes pulls text from a compressed PDF stream", async () => {
  const pdf = buildSinglePagePdf("Compressed text", { compressed: true })

  assert.equal(await extractPdfTextFromBytes(pdf), "Compressed text")
})
