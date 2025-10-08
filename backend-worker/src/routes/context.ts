import { Hono } from "hono";
import { runUpload } from "../utils/uploadFiles";
const context = new Hono<{ Bindings: Env }>();

/**
 * POST /context/upload
 * Body: { file_name: string, text: string }
 * Starts the RAG ingestion workflow
 */
context.post("/upload", async (c) => {
    const env = c.env;
    const body = await c.req.json() as Array<{ file_name: string; text: string }>;

    if (!Array.isArray(body)) {
        return new Response('Invalid JSON format: expected an array', { status: 400 });
    }

    const runRAG = await runUpload(body, env);

    // Return workflow instance ID (can be used to track status)
    return new Response(JSON.stringify(runRAG.message), { status: runRAG.status });
});

/**
 * GET /files
 * Optional query param file_name to filter
 */
context.get("/files", async (c) => {
    // get all filenames that are in the KV store
    const kvFiles = await c.env.KV.list();
    const files = kvFiles.keys.map((key) => ({ file_name: key.name }));
    return new Response(JSON.stringify(files), { status: 200 });
});

/**
 * GET /file/:id
 * Get file by ID (for simplicity, assuming ID is unique and corresponds to a single file)
 */
context.get("/file/:file_name", async (c) => {
    // get file by name from the kv store
    const fileName = c.req.param("file_name");
    if (!fileName) return new Response("Missing file name", { status: 400 });
    const fileIds = await c.env.KV.get(fileName);
    if (!fileIds) return new Response("File not found", { status: 404 });
    const ids = JSON.parse(fileIds);
    const placeholders = ids.map(() => "?").join(",");
    const sql = `SELECT id, text FROM Context WHERE id IN (${placeholders})`;
    const { results: rows = [] } = await c.env.DB.prepare(sql).bind(...ids).all();
    const text = rows.map((r) => r.text).join(" ");
    return new Response(JSON.stringify({ text }), { status: 200 });
});

/**
 * DELETE /file/:file_name
 */
context.delete("/file/:file_name", async (c) => {
    const fileName = c.req.param("file_name");
    if (!fileName) return new Response("Missing file name", { status: 400 });
    const fileIds = await c.env.KV.get(fileName);
    if (!fileIds) return new Response("File not found", { status: 404 });
    const ids = JSON.parse(fileIds);
    const placeholder = ids.map(() => "?").join(",");
    await c.env.DB.prepare(`DELETE FROM Context WHERE id IN (${placeholder})`).bind(...ids).run();
    await c.env.VECTORIZE.deleteByIds(ids.map((id: number) => id.toString()));
    await c.env.KV.delete(fileName);
    return new Response(JSON.stringify({ message: "File deleted" }), { status: 200 });
});

export default context;
