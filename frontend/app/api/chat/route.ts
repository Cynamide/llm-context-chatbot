export const runtime = "edge"

const WORKER_URL = process.env.WORKER_URL

function buildWorkerEndpoint(path: string) {
  if (!WORKER_URL) return ""
  const base = WORKER_URL.endsWith("/") ? WORKER_URL : `${WORKER_URL}/`
  return new URL(path, base).toString()
}

export async function POST(req: Request) {
  if (!WORKER_URL) {
    console.error("WORKER_URL is not set")
    return new Response(
      JSON.stringify({ error: "Worker URL not configured. Please set the WORKER_URL environment variable." }),
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

    const endpoint = buildWorkerEndpoint("api/query")
    console.log("Sending query to:", endpoint)

    // Forward the request to your Cloudflare Worker
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, top_k: 5 }),
    })

    console.log("Query response status:", response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error("Query failed with response:", text.substring(0, 200))
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
    console.error(" Chat API error:", error)
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
