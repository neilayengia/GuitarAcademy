/**
 * knowledgeDb.ts — Supabase/pgvector backed vector store for RAG knowledge chunks.
 *
 * Stores text chunks alongside their embedding vectors (from Gemini).
 * Supports cosine-similarity search for retrieval at query time.
 */

import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client for Server-Side Use
// Uses Vercel's standard process.env inside API functions
const getSupabase = () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    // For admin tasks (like ingestion) we use SERVICE_ROLE_KEY; for queries ANON_KEY is fine if RLS allows
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Key is missing from environment variables');
    }

    return createClient(supabaseUrl, supabaseKey);
};

// ── Storage ──────────────────────────────────────────────────────────────────

export interface ChunkRecord {
    id: string;
    source: string;
    text_content: string;
    embedding: number[];
}

/**
 * Store a text chunk with its embedding vector.
 */
export async function storeChunk(
    text: string,
    embedding: number[],
    source: string
): Promise<void> {
    const supabase = getSupabase();
    
    // Convert float array to JSON array string format for pgvector
    const formattedEmbedding = `[${embedding.join(',')}]`;

    const { error } = await supabase.from('knowledge_chunks').insert({
        source: source,
        text_content: text,
        embedding: formattedEmbedding,
    });

    if (error) {
        throw new Error(`Error storing chunk: ${error.message}`);
    }
}

/**
 * Store multiple chunks in a single transaction (much faster for bulk ingestion).
 */
export async function storeChunksBatch(
    chunks: { text: string; embedding: number[]; source: string }[]
): Promise<void> {
    const supabase = getSupabase();

    // Map into the format expected by the DB
    const rows = chunks.map(chunk => ({
        source: chunk.source,
        text_content: chunk.text,
        embedding: `[${chunk.embedding.join(',')}]`,
    }));

    // Perform bulk insert
    const { error } = await supabase.from('knowledge_chunks').insert(rows);

    if (error) {
        throw new Error(`Error string batch chunks: ${error.message}`);
    }
}

// ── Retrieval ────────────────────────────────────────────────────────────────

export interface QueryResult {
    text: string;
    source: string;
    similarity: number;
}

/**
 * Query the knowledge base using cosine similarity.
 * Returns the top-K most relevant chunks for a given query embedding.
 */
export async function queryChunks(queryEmbedding: number[], topK = 5): Promise<QueryResult[]> {
    const supabase = getSupabase();
    
    const formattedQuery = `[${queryEmbedding.join(',')}]`;

    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: formattedQuery,
        match_threshold: 0.5, // Return matches with similarity > 0.5
        match_count: topK,
    });

    if (error) {
        throw new Error(`Error querying chunks: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
        text: row.text_content,
        source: row.source,
        similarity: row.similarity,
    }));
}

// ── Management ───────────────────────────────────────────────────────────────

/**
 * Remove all chunks for a given source file (useful for re-ingestion).
 */
export async function clearSource(source: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase.from('knowledge_chunks').delete().eq('source', source);
    
    if (error) {
        throw new Error(`Error clearing source: ${error.message}`);
    }
}

/**
 * Get a summary of what's been ingested.
 */
export async function getStatus(): Promise<{ totalChunks: number; sources: { name: string; chunks: number }[] }> {
    const supabase = getSupabase();
    
    const { count, error: countErr } = await supabase
        .from('knowledge_chunks')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
         throw new Error(`Error getting status count: ${countErr.message}`);
    }

    // Since Supabase doesn't natively expose "GROUP BY" through the select API easily without RPC,
    // we'll fetch distinct sources. To keep it simple, we use a basic count query if data is small,
    // or you could add another RPC. Let's just create a quick aggregate if possible, or fetch all sources.
    const { data: sourcesData, error: sourcesErr } = await supabase
        .from('knowledge_chunks')
        .select('source');

    if (sourcesErr) {
        throw new Error(`Error getting status sources: ${sourcesErr.message}`);
    }

    const sourceCounts = (sourcesData || []).reduce((acc: any, curr: any) => {
        acc[curr.source] = (acc[curr.source] || 0) + 1;
        return acc;
    }, {});

    const sources = Object.entries(sourceCounts).map(([name, chunks]) => ({
        name,
        chunks: chunks as number,
    }));

    return { totalChunks: count || 0, sources };
}
