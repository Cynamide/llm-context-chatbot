import { describe, it, expect } from "vitest"
import { groupIdsByFileInChunkOrder, joinContentRows, sortRowsByIdOrder } from "../src/utils/fileContent"

describe("file content ordering", () => {
    it("keeps rows in the same order as the stored ids", () => {
        const rows = [
            { id: 3, text: "third" },
            { id: 1, text: "first" },
            { id: 2, text: "second" },
        ]

        const sorted = sortRowsByIdOrder(rows, ["1", "2", "3"])

        expect(sorted.map((row) => row.id)).toEqual([1, 2, 3])
    })

    it("joins rows with paragraph breaks", () => {
        const content = joinContentRows([
            { id: 1, text: "first chunk" },
            { id: 2, text: "second chunk" },
        ])

        expect(content).toBe("first chunk\n\nsecond chunk")
    })

    it("groups uploaded chunk ids in original chunk order", () => {
        const grouped = groupIdsByFileInChunkOrder([
            { index: 2, file_name: "resume.pdf", id: "12" },
            { index: 0, file_name: "resume.pdf", id: "10" },
            { index: 1, file_name: "resume.pdf", id: "11" },
        ])

        expect(grouped["resume.pdf"]).toEqual(["10", "11", "12"])
    })
})
