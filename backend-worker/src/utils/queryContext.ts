type ContextRow = {
    id: number
    file_name: string
    text: string
}

function sortRowsByIdOrder(rows: ContextRow[], ids: Array<string | number>) {
    const indexById = new Map(ids.map((id, index) => [String(id), index]))

    return [...rows].sort((left, right) => {
        const leftIndex = indexById.get(String(left.id)) ?? Number.POSITIVE_INFINITY
        const rightIndex = indexById.get(String(right.id)) ?? Number.POSITIVE_INFINITY
        return leftIndex - rightIndex
    })
}

function formatContextRows(rows: ContextRow[]) {
    return rows.map((row) => `File: ${row.file_name}\n${row.text}`).join("\n---\n")
}

async function fetchRowsByIds(env: Env, ids: Array<string | number>) {
    if (ids.length === 0) {
        return []
    }

    const placeholders = ids.map(() => "?").join(",")
    const sql = `SELECT id, file_name, text FROM Context WHERE id IN (${placeholders})`
    const { results: rows = [] } = await env.DB.prepare(sql).bind(...ids).all()
    return sortRowsByIdOrder(rows as ContextRow[], ids)
}

async function fetchRecentRows(env: Env, limit: number) {
    const { results: rows = [] } = await env.DB.prepare(
        "SELECT id, file_name, text FROM Context ORDER BY id DESC LIMIT ?",
    )
        .bind(limit)
        .all()

    return rows as ContextRow[]
}

export async function loadQueryContextRows(env: Env, ids: Array<string | number>, fallbackLimit = 20) {
    const matchedRows = await fetchRowsByIds(env, ids)

    if (matchedRows.length > 0) {
        return matchedRows
    }

    return fetchRecentRows(env, fallbackLimit)
}

export async function loadQueryContextText(env: Env, ids: Array<string | number>, fallbackLimit = 20) {
    const rows = await loadQueryContextRows(env, ids, fallbackLimit)
    return formatContextRows(rows)
}
