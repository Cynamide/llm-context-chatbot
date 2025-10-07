export const runtime = "edge"

const WORKER_URL = process.env.WORKER_URL

export async function POST(req: Request) {
  if (!WORKER_URL) {
    console.error("[v0] WORKER_URL or BACKEND environment variable is not set")
    return new Response(
      JSON.stringify({ error: "Worker URL not configured. Please set BACKEND or WORKER_URL environment variable." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  try {
    const { query } = await req.json()

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[v0] Sending query to:", `${WORKER_URL}api/query`)

    // Forward the request to your Cloudflare Worker
    const response = await fetch(`${WORKER_URL}api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: 5 }),
    })

    console.log("[v0] Query response status:", response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error("[v0] Query failed with response:", text.substring(0, 200))
      throw new Error(`Worker request failed: ${response.statusText}`)
    }

    // Stream the response from the worker
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
