import test from "node:test"
import assert from "node:assert/strict"
import { mapWithConcurrencyLimit } from "../src/utils/mapWithConcurrencyLimit.ts"

test("mapWithConcurrencyLimit keeps active work under the requested limit", async () => {
    let active = 0
    let maxActive = 0

    const results = await mapWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (item) => {
        active += 1
        maxActive = Math.max(maxActive, active)
        await new Promise((resolve) => setTimeout(resolve, 10))
        active -= 1
        return item * 2
    })

    assert.deepEqual(results, [2, 4, 6, 8, 10])
    assert.ok(maxActive <= 2)
})
