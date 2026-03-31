/**
 * ingest.ts — Knowledge base ingestion pipeline
 *
 * Reads PDF and TXT files from the `knowledge/` folder, chunks them,
 * generates embeddings via Gemini, and stores everything in SQLite.
 *
 * Usage: npm run knowledge:ingest
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { storeChunksBatch, clearSource, getStatus } from './knowledgeDb';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const KNOWLEDGE_DIR = path.resolve(process.cwd(), 'knowledge');
const CHUNK_SIZE = 1500;       // ~500 tokens ≈ 1500 characters
const CHUNK_OVERLAP = 200;     // overlap for context continuity
const EMBEDDING_BATCH = 20;    // Gemini embedContent calls per batch
const EMBEDDING_MODEL = 'gemini-embedding-001';

// ── Text Extraction ──────────────────────────────────────────────────────────

async function extractTextFromPdf(filePath: string): Promise<string> {
    // pdf-parse v2 uses the PDFParse class API
    const { PDFParse } = await import('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const uint8 = new Uint8Array(buffer);
    const pdf = new PDFParse(uint8);
    const result = await pdf.getText();
    pdf.destroy();
    return result.text;
}

function extractTextFromTxt(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}

async function extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.pdf': return extractTextFromPdf(filePath);
        case '.txt': return extractTextFromTxt(filePath);
        default:
            console.warn(`⚠ Skipping unsupported file type: ${ext}`);
            return '';
    }
}

// ── Chunking ─────────────────────────────────────────────────────────────────

interface TextChunk {
    text: string;
    index: number;
}

/**
 * Split text into overlapping chunks of roughly CHUNK_SIZE characters.
 * Tries to break at paragraph or sentence boundaries when possible.
 */
function chunkText(text: string): TextChunk[] {
    // Clean up the text — collapse excessive whitespace
    const cleaned = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

    if (cleaned.length <= CHUNK_SIZE) {
        return [{ text: cleaned, index: 0 }];
    }

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
        let end = Math.min(start + CHUNK_SIZE, cleaned.length);

        // Try to break at a paragraph boundary
        if (end < cleaned.length) {
            const paragraphBreak = cleaned.lastIndexOf('\n\n', end);
            if (paragraphBreak > start + CHUNK_SIZE * 0.3) {
                end = paragraphBreak + 2;
            } else {
                // Try sentence boundary
                const sentenceBreak = cleaned.lastIndexOf('. ', end);
                if (sentenceBreak > start + CHUNK_SIZE * 0.3) {
                    end = sentenceBreak + 2;
                }
            }
        }

        const chunkText = cleaned.slice(start, end).trim();
        if (chunkText.length > 50) { // Skip tiny fragments
            chunks.push({ text: chunkText, index });
            index++;
        }

        start = end - CHUNK_OVERLAP;
        if (start >= cleaned.length) break;
    }

    return chunks;
}

// ── Embedding ────────────────────────────────────────────────────────────────

async function embedTexts(ai: GoogleGenAI, texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH) {
        const batch = texts.slice(i, i + EMBEDDING_BATCH);
        const results = await Promise.all(
            batch.map(text =>
                ai.models.embedContent({
                    model: EMBEDDING_MODEL,
                    contents: text,
                })
            )
        );

        for (const result of results) {
            embeddings.push(result.embeddings?.[0]?.values ?? []);
        }

        // Rate limiting: short pause between batches
        if (i + EMBEDDING_BATCH < texts.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return embeddings;
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   Virtuoso Knowledge Base — Ingestion    ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // 1. Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('✗ GEMINI_API_KEY not found. Set it in .env.local');
        process.exit(1);
    }
    const ai = new GoogleGenAI({ apiKey });

    // 2. Scan knowledge folder
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
        console.error(`✗ Knowledge folder not found: ${KNOWLEDGE_DIR}`);
        console.error('  Create it and add your PDF/TXT files.');
        process.exit(1);
    }

    const files = fs.readdirSync(KNOWLEDGE_DIR)
        .filter(f => ['.pdf', '.txt'].includes(path.extname(f).toLowerCase()));

    if (files.length === 0) {
        console.error('✗ No PDF or TXT files found in knowledge/');
        console.error('  Drop your files there and run this command again.');
        process.exit(1);
    }

    console.log(`Found ${files.length} file(s) to ingest:\n`);

    // 3. Process each file
    let totalChunks = 0;

    for (const file of files) {
        const filePath = path.join(KNOWLEDGE_DIR, file);
        console.log(`── ${file} ──`);

        // Extract text
        process.stdout.write('  Extracting text... ');
        const text = await extractText(filePath);
        if (!text) {
            console.log('SKIPPED (empty or unsupported)');
            continue;
        }
        console.log(`${text.length.toLocaleString()} characters`);

        // Chunk
        process.stdout.write('  Chunking... ');
        const chunks = chunkText(text);
        console.log(`${chunks.length} chunks`);

        // Clear old data for this file (re-ingestion)
        clearSource(file);

        // Embed
        process.stdout.write(`  Embedding ${chunks.length} chunks... `);
        const embeddings = await embedTexts(ai, chunks.map(c => c.text));
        console.log('done');

        // Store
        process.stdout.write('  Storing in database... ');
        storeChunksBatch(
            chunks.map((chunk, i) => ({
                text: chunk.text,
                embedding: embeddings[i],
                source: file,
                chunkIndex: chunk.index,
            }))
        );
        console.log('done\n');

        totalChunks += chunks.length;
    }

    // 4. Summary
    const status = getStatus();
    console.log('════════════════════════════════════════════');
    console.log(`✓ Ingestion complete!`);
    console.log(`  Total chunks in knowledge base: ${status.totalChunks}`);
    console.log(`  Sources:`);
    for (const src of status.sources) {
        console.log(`    • ${src.name} — ${src.chunks} chunks`);
    }
    console.log('');
}

main().catch(err => {
    console.error('✗ Ingestion failed:', err.message);
    process.exit(1);
});
