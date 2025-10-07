"use server"

const WORKER_URL = process.env.WORKER_URL

if (!WORKER_URL) {
  console.error("[v0] WORKER_URL or BACKEND environment variable is not set")
}

export async function uploadKnowledge(data: Array<{ file_name: string; text: string }>) {
  if (!WORKER_URL) {
    return {
      success: false,
      error: "Worker URL not configured. Please set BACKEND or WORKER_URL environment variable.",
    }
  }

  try {
    console.log("[v0] Uploading to:", `${WORKER_URL}api/context/upload`)
    const response = await fetch(`${WORKER_URL}api/context/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    console.log("[v0] Upload response status:", response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error("[v0] Upload failed with response:", text)
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    return { success: true, message: result.message }
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

export async function getKnowledgeFiles() {
  if (!WORKER_URL) {
    return {
      success: false,
      error: "Worker URL not configured. Please set BACKEND or WORKER_URL environment variable.",
      files: [],
    }
  }

  try {
    console.log("[v0] Fetching files from:", `${WORKER_URL}api/context/files`)
    const response = await fetch(`${WORKER_URL}api/context/files`, {
      cache: "no-store",
    })

    console.log("[v0] Fetch files response status:", response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error("[v0] Fetch failed with response:", text.substring(0, 200))
      throw new Error(`Failed to fetch files: ${response.statusText}`)
    }

    const result = await response.json()
    return { success: true, files: result || [] }
  } catch (error) {
    console.error("[v0] Fetch files error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch files",
      files: [],
    }
  }
}

export async function deleteKnowledgeFile(fileName: string) {
  if (!WORKER_URL) {
    return {
      success: false,
      error: "Worker URL not configured. Please set BACKEND or WORKER_URL environment variable.",
    }
  }

  try {
    console.log("[v0] Deleting file:", `${WORKER_URL}api/context/file/${encodeURIComponent(fileName)}`)
    const response = await fetch(`${WORKER_URL}api/context/file/${encodeURIComponent(fileName)}`, {
      method: "DELETE",
    })

    console.log("[v0] Delete response status:", response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error("[v0] Delete failed with response:", text)
      throw new Error(`Delete failed: ${response.statusText}`)
    }

    const result = await response.json()
    console.log(result)
    return { success: true, message: result.message }
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    }
  }
}

export async function getFileContent(fileName: string) {
  if (!WORKER_URL) {
    return {
      success: false,
      error: "Worker URL not configured. Please set BACKEND or WORKER_URL environment variable.",
      content: "",
    }
  }

  try {
    console.log("[v0] Fetching file content:", `${WORKER_URL}api/context/file/${encodeURIComponent(fileName)}`)
    const response = await fetch(`${WORKER_URL}api/context/file/${encodeURIComponent(fileName)}`, {
      cache: "no-store",
    })

    console.log("[v0] Fetch file content response status:", response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error("[v0] Fetch file content failed with response:", text.substring(0, 200))
      throw new Error(`Failed to fetch file content: ${response.statusText}`)
    }

    const result = await response.json()
    return { success: true, content: result.text || "" }
  } catch (error) {
    console.error("[v0] Fetch file content error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch file content",
      content: "",
    }
  }
}
