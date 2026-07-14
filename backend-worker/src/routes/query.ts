import { Hono } from "hono";
import { createEmbeddings } from "../utils/embeddings";
import { loadQueryContextText } from "../utils/queryContext";

const router = new Hono<{ Bindings: Env }>();

router.post("/", async (c) => {
    const { query, top_k = 5 } = await c.req.json();
    if (!query) return c.json({ error: "Missing query" }, 400);

    // 1️. Embed query + search in vector index
    const [qVec] = await createEmbeddings(c.env, [query]);
    const results = await c.env.VECTORIZE.query(qVec, { topK: top_k });
    const ids = results.matches?.map((m: any) => m.id) || [];
    // 2️. Get matched texts from D1, falling back to recent rows if vector search is empty.
    const context = await loadQueryContextText(c.env, ids);

    // 3️. Ask LLM with streaming SSE
    const messages = [
        { role: "system", content: `You are a helpful assistant. answer the questions considering the context first. Context:\n${context}` },
        { role: "user", content: query },
    ];

    console.log("LLM messages:", messages);
    // ts ignore because of a typing issue in Workers AI SDK
    // @ts-ignore
    const stream = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
        messages,
        stream: true,
    });

    return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
});

export default router;
