import { describe, it, expect } from "vitest"
import { loadQueryContextRows } from "../src/utils/queryContext.ts"

type PreparedQuery = {
    bind: (...args: Array<string | number>) => {
        all: () => Promise<{ results: Array<{ id: number; file_name: string; text: string }> }>
    }
}

function createEnv(rowsByQuery: Record<string, Array<{ id: number; file_name: string; text: string }>>) {
    return {
        DB: {
            prepare(sql: string): PreparedQuery {
                return {
                    bind: (...args: Array<string | number>) => {
                        const key = `${sql}::${args.map(String).join(",")}`
                        return {
                            all: async () => ({
                                results: rowsByQuery[key] || [],
                            }),
                        }
                    },
                }
            },
        },
    } as unknown as Env
}

describe("query context fallback", () => {
    it("returns recent stored rows when vector matches are empty", async () => {
        const env = createEnv({
            "SELECT id, file_name, text FROM Context WHERE id IN (?)::1": [],
            "SELECT id, file_name, text FROM Context ORDER BY id DESC LIMIT ?::20": [
                { id: 9, file_name: "resume.pdf", text: "resume text" },
            ],
        })

        const rows = await loadQueryContextRows(env, [], 20)

        expect(rows).toEqual([
            { id: 9, file_name: "resume.pdf", text: "resume text" },
        ])
    })
})
