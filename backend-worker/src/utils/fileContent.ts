type ContentRow = { id: number; text: string }

type UploadChunkResult = {
    index: number
    file_name: string
    id: string
}

export function sortRowsByIdOrder(rows: ContentRow[], ids: Array<string | number>) {
    const indexById = new Map(ids.map((id, index) => [String(id), index]))

    return [...rows].sort((left, right) => {
        const leftIndex = indexById.get(String(left.id)) ?? Number.POSITIVE_INFINITY
        const rightIndex = indexById.get(String(right.id)) ?? Number.POSITIVE_INFINITY
        return leftIndex - rightIndex
    })
}

export function joinContentRows(rows: ContentRow[]) {
    return rows.map((row) => row.text).join("\n\n")
}

export function groupIdsByFileInChunkOrder(results: UploadChunkResult[]) {
    const grouped: Record<string, string[]> = {}

    for (const result of [...results].sort((left, right) => left.index - right.index)) {
        grouped[result.file_name] = grouped[result.file_name] || []
        grouped[result.file_name].push(result.id)
    }

    return grouped
}
