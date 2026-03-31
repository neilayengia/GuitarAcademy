/**
 * ragServer.ts — Express API for the knowledge base
 *
 * Lightweight server that:
 *  - Accepts queries and returns the most relevant knowledge chunks
 *  - Reports knowledge base status (ingested files, chunk counts)
 *
 * Usage: npm run knowledge:serve
 */

import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { queryChunks, getStatus } from './knowledgeDb';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = process.env.RAG_PORT ? parseInt(process.env.RAG_PORT) : 3001;
const EMBEDDING_MODEL = 'gemini-embedding-001';

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('✗ GEMINI_API_KEY not found. Set it in .env.local');
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey });
    const app = express();

    app.use(express.json());

    // CORS — allow the Vite dev server to call us
    app.use((_req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        next();
    });
    app.options('*', (_req, res) => res.sendStatus(204));

    // ── POST /api/query ──────────────────────────────────────────────────────
    // Body: { query: string, topK?: number }
    // Returns: { results: { text, source, similarity }[] }

    app.post('/api/query', async (req, res) => {
        try {
            const { query, topK = 5 } = req.body;

            if (!query || typeof query !== 'string') {
                return res.status(400).json({ error: 'Missing "query" string in body' });
            }

            // Embed the query
            const embResult = await ai.models.embedContent({
                model: EMBEDDING_MODEL,
                contents: query,
            });

            const queryEmbedding = embResult.embeddings?.[0]?.values;
            if (!queryEmbedding) {
                return res.status(500).json({ error: 'Failed to generate query embedding' });
            }

            // Search
            const results = queryChunks(queryEmbedding, topK);

            return res.json({ results });
        } catch (err: any) {
            console.error('Query error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    });

    // ── GET /api/credentials ─────────────────────────────────────────────────
    // Returns the API key to the client in memory (avoids hardcoding in bundle)
    // In production, this would be highly restricted by origin and session auth.

    app.get('/api/credentials', (req, res) => {
        // Basic origin checking
        const origin = req.get('origin') || req.get('referer');

        // Very permissive for dev, but establishes the pattern
        if (process.env.NODE_ENV === 'production') {
            const allowedOrigins = [process.env.PUBLIC_URL];
            if (!origin || !allowedOrigins.some(valid => origin.startsWith(valid || ''))) {
                return res.status(403).json({ error: 'Unauthorized origin' });
            }
        }

        return res.json({ apiKey: process.env.GEMINI_API_KEY });
    });

    // ── GET /api/status ──────────────────────────────────────────────────────
    // Returns: { totalChunks, sources: [{ name, chunks }] }

    app.get('/api/status', (_req, res) => {
        try {
            const status = getStatus();
            return res.json(status);
        } catch (err: any) {
            return res.status(500).json({ error: err.message });
        }
    });

    // ── Start ────────────────────────────────────────────────────────────────

    app.listen(PORT, () => {
        console.log(`\n🧠 Knowledge API running on http://localhost:${PORT}`);
        console.log(`   POST /api/query   — search the knowledge base`);
        console.log(`   GET  /api/status  — view ingestion status\n`);

        const status = getStatus();
        if (status.totalChunks === 0) {
            console.log('⚠  Knowledge base is empty. Run "npm run knowledge:ingest" first.\n');
        } else {
            console.log(`✓  ${status.totalChunks} chunks from ${status.sources.length} source(s) ready.\n`);
        }
    });
}

main().catch(err => {
    console.error('✗ Server failed to start:', err.message);
    process.exit(1);
});
