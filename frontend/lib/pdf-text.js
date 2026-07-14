import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs"

if (!globalThis.pdfjsWorker) {
  globalThis.pdfjsWorker = { WorkerMessageHandler: pdfjsWorker.WorkerMessageHandler }
}

const standardFontDataUrl =
  typeof process !== "undefined" && process.versions?.node
    ? `${process.cwd()}/frontend/node_modules/pdfjs-dist/standard_fonts/`
    : "/pdfjs-dist/standard_fonts/"

function normalizeBytes(bytes) {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(bytes)) {
    return Uint8Array.from(bytes)
  }

  if (bytes instanceof Uint8Array) {
    return bytes
  }

  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes)
  }

  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function decodePdfLiteralString(input) {
  let output = ""

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (char !== "\\") {
      output += char
      continue
    }

    const next = input[index + 1]
    if (!next) {
      break
    }

    if (next === "n") {
      output += "\n"
      index += 1
      continue
    }

    if (next === "r") {
      output += "\r"
      index += 1
      continue
    }

    if (next === "t") {
      output += "\t"
      index += 1
      continue
    }

    if (next === "b") {
      output += "\b"
      index += 1
      continue
    }

    if (next === "f") {
      output += "\f"
      index += 1
      continue
    }

    if (next === "(" || next === ")" || next === "\\") {
      output += next
      index += 1
      continue
    }

    const octalMatch = input.slice(index + 1).match(/^[0-7]{1,3}/)
    if (octalMatch) {
      output += String.fromCharCode(Number.parseInt(octalMatch[0], 8))
      index += octalMatch[0].length
      continue
    }

    output += next
    index += 1
  }

  return output
}

function decodePdfHexString(input) {
  const cleaned = input.replace(/\s+/g, "")
  if (!cleaned) return ""

  const normalized = cleaned.length % 2 === 0 ? cleaned : `${cleaned}0`
  const bytes = []

  for (let index = 0; index < normalized.length; index += 2) {
    bytes.push(Number.parseInt(normalized.slice(index, index + 2), 16))
  }

  const byteArray = new Uint8Array(bytes)
  if (byteArray[0] === 0xfe && byteArray[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(byteArray.slice(2))
  }

  if (byteArray[0] === 0xff && byteArray[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(byteArray.slice(2))
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(byteArray)
}

function decodePdfTextToken(token) {
  if (token.startsWith("(") && token.endsWith(")")) {
    return decodePdfLiteralString(token.slice(1, -1))
  }

  if (token.startsWith("<") && token.endsWith(">")) {
    return decodePdfHexString(token.slice(1, -1))
  }

  return ""
}

function normalizeText(segments) {
  return segments
    .join(" ")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTextFromRawPdfBytes(bytes) {
  const source = new TextDecoder("latin1").decode(bytes)
  const segments = []

  const directTextPattern = /(\((?:\\.|[^\\()])*\)|<[^<>]+>)\s*T[Jj]/gs
  for (const match of source.matchAll(directTextPattern)) {
    const text = decodePdfTextToken(match[1])
    if (text) segments.push(text)
  }

  const arrayTextPattern = /\[(.*?)\]\s*TJ/gs
  for (const match of source.matchAll(arrayTextPattern)) {
    const tokenPattern = /(\((?:\\.|[^\\()])*\)|<[^<>]+>)/gs
    for (const token of match[1].matchAll(tokenPattern)) {
      const text = decodePdfTextToken(token[1])
      if (text) segments.push(text)
    }
  }

  return normalizeText(segments)
}

async function extractTextWithPdfJs(bytes) {
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl,
  })

  try {
    const pdf = await loadingTask.promise
    const segments = []

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex)
      const textContent = await page.getTextContent()
      for (const item of textContent.items) {
        if (item?.str) {
          segments.push(item.str)
        }
      }
    }

    return normalizeText(segments)
  } finally {
    loadingTask.destroy?.()
  }
}

export async function extractPdfTextFromBytes(bytes) {
  const buffer = normalizeBytes(bytes)

  try {
    const extracted = await extractTextWithPdfJs(buffer)
    if (extracted) {
      return extracted
    }
  } catch (error) {
    console.warn("pdf.js text extraction failed, falling back to raw scan", error)
  }

  return extractTextFromRawPdfBytes(buffer)
}
