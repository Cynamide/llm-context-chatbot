import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

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
        const docs = await splitter.createDocuments([file.text]);
        const chunks = docs.map((d) => d.pageContent);
        console.log(`File "${file.file_name}" split into ${chunks.length} chunks`);
        fileChunks[file.file_name] = chunks;
    }

    // Flattened array of all chunks with corresponding file_name for parallel processing
    const allChunks: Array<{ file_name: string; chunk: string }> = Object.entries(fileChunks)
        .flatMap(([file_name, chunks]) =>
            chunks.map(chunk => ({ file_name, chunk }))
        );

    // Map to collect all generated IDs for each file
    const fileToIds: Record<string, string[]> = {};

    // Step 2: Process all chunks in parallel (D1 & Vectorize)
    const completed = await Promise.all(
        allChunks.map(async ({ file_name, chunk }, i) => {
            try {
                // Insert chunk into D1
                const { results } = await env.DB.prepare(
                    "INSERT INTO Context (file_name,text) VALUES (?,?) RETURNING *"
                )
                    .bind(file_name, chunk)
                    .run();

                const record = results?.[0] as { id: number; text: string };
                if (!record) throw new Error(`Failed to insert chunk ${i} for file ${file_name}`);

                fileToIds[file_name] = fileToIds[file_name] || [];
                fileToIds[file_name].push(record.id.toString());

                // Generate embedding
                const embeddings = await env.AI.run("@cf/google/embeddinggemma-300m", { text: chunk });
                const values = embeddings.data?.[0];
                if (!values) throw new Error(`Embedding failed for chunk ${i} of file ${file_name}`);

                // Insert vector into Vectorize
                await env.VECTORIZE.upsert([
                    {
                        id: record.id.toString(),
                        values,
                    },
                ]);


            } catch (err) {
                console.error(`Error processing chunk ${i} of file "${file_name}":`, err);
                return false
            }
            return true;
        })
    );

    // Step 3: Write all collected IDs to the KV store *sequentially per file*
    const kvUpdates = Object.entries(fileToIds).map(([file_name, newIds]) => {
        return env.KV.put(file_name, JSON.stringify(newIds));
    });

    // Wait for all KV updates to complete
    await Promise.all(kvUpdates);

    // Final checks
    const successfulChunks = completed.filter(c => c).length;
    if (successfulChunks !== allChunks.length) {
        return { message: `Processed ${successfulChunks} out of ${allChunks.length} chunks with some errors`, status: 500 };
    }
    return { message: `Processed ${allChunks.length} chunks from ${payload.length} files`, status: 200 };
}