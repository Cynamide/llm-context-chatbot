import { Hono } from "hono";
import { runUpload } from "../utils/uploadFiles";
import { joinContentRows, sortRowsByIdOrder } from "../utils/fileContent";
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
    return new Response(JSON.stringify({ message: runRAG.message }), {
        status: runRAG.status,
        headers: { "Content-Type": "application/json" },
    });
});

/**
 * GET /files
 * Optional query param file_name to filter
 */
context.get("/files", async (c) => {
    // get all filenames that are in the KV store
    const kvFiles = await c.env.KV.list();
    const { results: dbFiles = [] } = await c.env.DB.prepare(
        "SELECT DISTINCT file_name FROM Context ORDER BY file_name"
    ).all();
    const names = new Set<string>();
    kvFiles.keys.forEach((key) => names.add(key.name));
    (dbFiles as Array<{ file_name: string }>).forEach((row) => names.add(row.file_name));
    const files = [...names].map((name) => ({ file_name: name }));
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
    const ids = fileIds ? JSON.parse(fileIds) : [];
    if ((!Array.isArray(ids) || ids.length === 0)) {
        const { results: rows = [] } = await c.env.DB.prepare(
            "SELECT id FROM Context WHERE file_name = ? ORDER BY id"
        ).bind(fileName).all();
        const fallbackIds = (rows as Array<{ id: number }>).map((row) => row.id.toString());
        if (fallbackIds.length === 0) {
            return new Response("File not found", { status: 404 });
        }
        await c.env.KV.put(fileName, JSON.stringify(fallbackIds));
        const fallbackPlaceholders = fallbackIds.map(() => "?").join(",");
        const fallbackSql = `SELECT id, text FROM Context WHERE id IN (${fallbackPlaceholders})`;
        const { results: fallbackRows = [] } = await c.env.DB.prepare(fallbackSql).bind(...fallbackIds).all();
        const orderedFallbackRows = sortRowsByIdOrder(
            fallbackRows as Array<{ id: number; text: string }>,
            fallbackIds,
        );
        const fallbackText = joinContentRows(orderedFallbackRows);
        return new Response(JSON.stringify({ text: fallbackText }), { status: 200 });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
        return new Response(JSON.stringify({ text: "" }), { status: 200 });
    }
    const placeholders = ids.map(() => "?").join(",");
    const sql = `SELECT id, text FROM Context WHERE id IN (${placeholders})`;
    const { results: rows = [] } = await c.env.DB.prepare(sql).bind(...ids).all();
    const orderedRows = sortRowsByIdOrder(rows as Array<{ id: number; text: string }>, ids);
    const text = joinContentRows(orderedRows);
    return new Response(JSON.stringify({ text }), { status: 200 });
});

/**
 * DELETE /file/:file_name
 */
context.delete("/file/:file_name", async (c) => {
    const fileName = c.req.param("file_name");
    if (!fileName) return new Response("Missing file name", { status: 400 });
    const fileIds = await c.env.KV.get(fileName);
    let ids = fileIds ? JSON.parse(fileIds) : [];
    if (!Array.isArray(ids) || ids.length === 0) {
        const { results: rows = [] } = await c.env.DB.prepare(
            "SELECT id FROM Context WHERE file_name = ?"
        ).bind(fileName).all();
        ids = (rows as Array<{ id: number }>).map((row) => row.id.toString());
        if (ids.length === 0) return new Response("File not found", { status: 404 });
    }
    if (Array.isArray(ids) && ids.length > 0) {
        const placeholder = ids.map(() => "?").join(",");
        await c.env.DB.prepare(`DELETE FROM Context WHERE id IN (${placeholder})`).bind(...ids).run();
        await c.env.VECTORIZE.deleteByIds(ids.map((id: number) => id.toString()));
    }
    await c.env.KV.delete(fileName);
    return new Response(JSON.stringify({ message: "File deleted" }), { status: 200 });
});

export default context;
