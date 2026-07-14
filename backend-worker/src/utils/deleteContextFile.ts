type FileRow = {
    id: number
    file_name: string
}

export async function deleteContextFile(env: Env, fileName: string) {
    const { results: rows = [] } = await env.DB.prepare(
        "SELECT id FROM Context WHERE file_name = ? ORDER BY id",
    )
        .bind(fileName)
        .all()

    const ids = (rows as FileRow[]).map((row) => row.id.toString())

    if (ids.length === 0) {
        return { message: "File not found", status: 404 }
    }

    await env.DB.prepare("DELETE FROM Context WHERE file_name = ?")
        .bind(fileName)
        .run()

    await env.VECTORIZE.deleteByIds(ids)
    await env.KV.delete(fileName)

    return { message: "File deleted", status: 200 }
}
