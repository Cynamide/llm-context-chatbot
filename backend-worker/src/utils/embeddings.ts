export async function createEmbeddings(env: Env, texts: string[]) {
    if (!texts || texts.length === 0) return [];

    const resp = await env.AI.run("@cf/google/embeddinggemma-300m", {
        text: texts,
    });

    // Common shapes:
    // 1) resp.data = [[...], [...]]
    // 2) resp = [[...], [...]]
    if (Array.isArray(resp)) return resp as number[][];
    if (resp && Array.isArray((resp as any).data)) return (resp as any).data as number[][];
    if ((resp as any).embeddings && Array.isArray((resp as any).embeddings)) return (resp as any).embeddings;
    // fallback
    return [];
}
