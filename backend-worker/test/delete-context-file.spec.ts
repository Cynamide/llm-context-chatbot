import { describe, it, expect } from "vitest"
import { deleteContextFile } from "../src/utils/deleteContextFile"

function createEnv() {
    const calls: Array<{ type: string; sql?: string; args?: Array<string | number> }> = []

    const env = {
        DB: {
            prepare(sql: string) {
                return {
                    bind: (...args: Array<string | number>) => ({
                        all: async () => {
                            calls.push({ type: "all", sql, args })
                            return {
                                results: [
                                    { id: 101, file_name: "resume.pdf", text: "chunk 1" },
                                    { id: 102, file_name: "resume.pdf", text: "chunk 2" },
                                    { id: 103, file_name: "resume.pdf", text: "chunk 3" },
                                ],
                            }
                        },
                        run: async () => {
                            calls.push({ type: "run", sql, args })
                            return { success: true }
                        },
                    }),
                }
            },
        },
        VECTORIZE: {
            deleteByIds: async (ids: string[]) => {
                calls.push({ type: "vectorize", args: ids })
            },
        },
        KV: {
            delete: async (fileName: string) => {
                calls.push({ type: "kv-delete", args: [fileName] })
            },
        },
    } as unknown as Env

    return { env, calls }
}

describe("deleteContextFile", () => {
    it("deletes every stored row for a file name", async () => {
        const { env, calls } = createEnv()

        const result = await deleteContextFile(env, "resume.pdf")

        expect(result).toEqual({ message: "File deleted", status: 200 })
        expect(calls).toEqual([
            {
                type: "all",
                sql: "SELECT id FROM Context WHERE file_name = ? ORDER BY id",
                args: ["resume.pdf"],
            },
            {
                type: "run",
                sql: "DELETE FROM Context WHERE file_name = ?",
                args: ["resume.pdf"],
            },
            {
                type: "vectorize",
                args: ["101", "102", "103"],
            },
            {
                type: "kv-delete",
                args: ["resume.pdf"],
            },
        ])
    })
})
