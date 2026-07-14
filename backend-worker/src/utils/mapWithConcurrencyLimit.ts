export async function mapWithConcurrencyLimit<T, R>(
    items: T[],
    limit: number,
    mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    if (limit < 1) {
        throw new Error("limit must be at least 1")
    }

    const results: R[] = new Array(items.length)
    let nextIndex = 0

    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex
            nextIndex += 1
            results[currentIndex] = await mapper(items[currentIndex], currentIndex)
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
    await Promise.all(workers)
    return results
}
