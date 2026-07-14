import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createEmbeddings } from "./embeddings";
import { groupIdsByFileInChunkOrder } from "./fileContent";
import { mapWithConcurrencyLimit } from "./mapWithConcurrencyLimit";

export async function runUpload(payload: Array<{ file_name: string; text: string }>, env: Env) {
    const splitter = new RecursiveCharacterTextSplitter();

    // Group of chunks, key is file_name, value is array of chunks for that file
    const fileChunks: Record<string, string[]> = {};

    // Step 1: Split each file into chunks and keep track of file_name
    for (const file of payload) {
        const kvExists = await env.KV.get(file.file_name);
        if (kvExists) {
            console.log(`File "${file.file_name}" already exists in KV store`);
            continue;
        }
        const { results: existingRows = [] } = await env.DB.prepare(
            "SELECT id FROM Context WHERE file_name = ? LIMIT 1"
        )
            .bind(file.file_name)
            .all();
        if (existingRows.length > 0) {
            console.log(`File "${file.file_name}" already exists in D1`);
            continue;
        }
        const docs = await splitter.createDocuments([file.text]);
        const chunks = docs.map((d) => d.pageContent);
        console.log(`File "${file.file_name}" split into ${chunks.length} chunks`);
        fileChunks[file.file_name] = chunks;
    }

    // Flattened array of all chunks with corresponding file_name for parallel processing
    const allChunks: Array<{ index: number; file_name: string; chunk: string }> = Object.entries(fileChunks)
        .flatMap(([file_name, chunks]) =>
            chunks.map((chunk, index) => ({ index, file_name, chunk }))
        );

    // Step 2: Process all chunks in parallel (D1 & Vectorize)
    const completed = await mapWithConcurrencyLimit(allChunks, 4, async ({ index, file_name, chunk }, i) => {
            try {
                // Insert chunk into D1 and read the returning row.
                const { results } = await env.DB.prepare(
                    "INSERT INTO Context (file_name,text) VALUES (?,?) RETURNING *"
                )
                    .bind(file_name, chunk)
                    .all();

                const record = results?.[0] as { id: number; text: string };
                if (!record) throw new Error(`Failed to insert chunk ${i} for file ${file_name}`);

                // Generate embedding.
                const [values] = await createEmbeddings(env, [chunk]);
                if (!values) throw new Error(`Embedding failed for chunk ${i} of file ${file_name}`);

                // Insert vector into Vectorize
                await env.VECTORIZE.upsert([
                    {
                        id: record.id.toString(),
                        values,
                    },
                ]);
                return { index, file_name, id: record.id.toString() };
            } catch (err) {
                console.error(`Error processing chunk ${i} of file "${file_name}":`, err);
                return null
            }
        });

    const fileToIds = Object.fromEntries(
        Object.keys(fileChunks).map((fileName) => [fileName, [] as string[]]),
    ) as Record<string, string[]>;
    const groupedIds = groupIdsByFileInChunkOrder(
        completed.filter((item): item is { index: number; file_name: string; id: string } => item !== null),
    );

    for (const [fileName, ids] of Object.entries(groupedIds)) {
        fileToIds[fileName] = ids;
    }

    // Step 3: Write all collected IDs to the KV store *sequentially per file*
    const kvUpdates = Object.entries(fileToIds).map(([file_name, newIds]) => {
        return env.KV.put(file_name, JSON.stringify(newIds));
    });

    // Wait for all KV updates to complete
    await Promise.all(kvUpdates);

    // Final checks
    const successfulChunks = completed.filter((c) => c !== null).length;
    if (successfulChunks !== allChunks.length) {
        return { message: `Processed ${successfulChunks} out of ${allChunks.length} chunks with some errors`, status: 500 };
    }
    return { message: `Processed ${allChunks.length} chunks from ${payload.length} files`, status: 200 };
}
