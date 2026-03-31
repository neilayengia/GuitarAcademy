/**
 * knowledgeDb.ts — SQLite-backed vector store for RAG knowledge chunks.
 *
 * Stores text chunks alongside their embedding vectors (from Gemini).
 * Supports cosine-similarity search for retrieval at query time.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'knowledge.db');

let db: Database.Database | null = null;

// ── Database Lifecycle ───────────────────────────────────────────────────────

export function getDb(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        initDb(db);
    }
    return db;
}

function initDb(database: Database.Database): void {
    database.exec(`
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            text TEXT NOT NULL,
            embedding BLOB NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source);
    `);
}

// ── Storage ──────────────────────────────────────────────────────────────────

export interface ChunkRecord {
    id: number;
    source: string;
    chunkIndex: number;
    text: string;
    embedding: Float32Array;
}

/**
 * Store a text chunk with its embedding vector.
 */
export function storeChunk(
    text: string,
    embedding: number[],
    source: string,
    chunkIndex: number
): void {
    const database = getDb();
    const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);

    database.prepare(`
        INSERT INTO chunks (source, chunk_index, text, embedding)
        VALUES (?, ?, ?, ?)
    `).run(source, chunkIndex, text, embeddingBlob);
}

/**
 * Store multiple chunks in a single transaction (much faster for bulk ingestion).
 */
export function storeChunksBatch(
    chunks: { text: string; embedding: number[]; source: string; chunkIndex: number }[]
): void {
    const database = getDb();
    const insert = database.prepare(`
        INSERT INTO chunks (source, chunk_index, text, embedding)
        VALUES (?, ?, ?, ?)
    `);

    const tx = database.transaction(() => {
        for (const chunk of chunks) {
            const embeddingBlob = Buffer.from(new Float32Array(chunk.embedding).buffer);
            insert.run(chunk.source, chunk.chunkIndex, chunk.text, embeddingBlob);
        }
    });

    tx();
}

// ── Retrieval ────────────────────────────────────────────────────────────────

/**
 * Cosine similarity between two Float32Arrays.
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

export interface QueryResult {
    text: string;
    source: string;
    chunkIndex: number;
    similarity: number;
}

/**
 * Query the knowledge base using cosine similarity.
 * Returns the top-K most relevant chunks for a given query embedding.
 */
export function queryChunks(queryEmbedding: number[], topK = 5): QueryResult[] {
    const database = getDb();
    const queryVec = new Float32Array(queryEmbedding);

    const rows = database.prepare(`
        SELECT id, source, chunk_index, text, embedding FROM chunks
    `).all() as { id: number; source: string; chunk_index: number; text: string; embedding: Buffer }[];

    const scored = rows.map(row => {
        const storedVec = new Float32Array(
            row.embedding.buffer,
            row.embedding.byteOffset,
            row.embedding.byteLength / 4
        );
        return {
            text: row.text,
            source: row.source,
            chunkIndex: row.chunk_index,
            similarity: cosineSimilarity(queryVec, storedVec),
        };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
}

// ── Management ───────────────────────────────────────────────────────────────

/**
 * Remove all chunks for a given source file (useful for re-ingestion).
 */
export function clearSource(source: string): void {
    const database = getDb();
    database.prepare('DELETE FROM chunks WHERE source = ?').run(source);
}

/**
 * Get a summary of what's been ingested.
 */
export function getStatus(): { totalChunks: number; sources: { name: string; chunks: number }[] } {
    const database = getDb();
    const total = (database.prepare('SELECT COUNT(*) as count FROM chunks').get() as any).count;
    const sources = database.prepare(
        'SELECT source as name, COUNT(*) as chunks FROM chunks GROUP BY source ORDER BY source'
    ).all() as { name: string; chunks: number }[];

    return { totalChunks: total, sources };
}
