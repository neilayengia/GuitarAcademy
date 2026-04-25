/**
 * ingestLarge.ts — Big Memory Ingestion Pipeline
 *
 * Reads massive PDF files (e.g., The Beato Book) from `knowledge/_large/`,
 * extracts the text, and processes chunks in isolated batches. This prevents
 * V8 out-of-memory errors by embedding and writing to SQLite sequentially
 * and manually triggering garbage collection.
 *
 * Usage: npm run knowledge:ingest-large
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { storeChunksBatch, clearSource, getStatus } from './knowledgeDb';

dotenv.config({ path: '.env.local' });
dotenv.config();

const LARGE_DIR = path.resolve(process.cwd(), 'knowledge', '_large');
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const PROCESS_BATCH = 50; // How many chunks to embed and store before GC
const EMBEDDING_MODEL = 'text-embedding-004';

// ── Text Extraction ──────────────────────────────────────────────────────────

async function extractTextFromPdf(filePath: string): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const uint8 = new Uint8Array(buffer);
    const pdf = new PDFParse(uint8);
    const result = await pdf.getText();
    pdf.destroy();
    return result.text;
}

// ── Chunking ─────────────────────────────────────────────────────────────────

interface TextChunk {
    text: string;
    index: number;
}

function chunkText(text: string): TextChunk[] {
    // Do not run chained .replace(/[ \t]+/g) on 50MB string, it triggers V8 RegExp Stack Overflow (Abort Trap)
    // Instead, just break the string safely, or do limited whitespace collapse.
    // For safety, we just split and join to collapse if needed, or don't clean excessively.
    if (text.length <= CHUNK_SIZE) {
        return [{ text: text.trim(), index: 0 }];
    }

    const cleaned = text;

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < cleaned.length) {
        let end = Math.min(start + CHUNK_SIZE, cleaned.length);

        if (end < cleaned.length) {
            const paragraphBreak = cleaned.lastIndexOf('\n\n', end);
            if (paragraphBreak > start + CHUNK_SIZE * 0.3) {
                end = paragraphBreak + 2;
            } else {
                const sentenceBreak = cleaned.lastIndexOf('. ', end);
                if (sentenceBreak > start + CHUNK_SIZE * 0.3) {
                    end = sentenceBreak + 2;
                }
            }
        }

        const chunkText = cleaned.slice(start, end).trim();
        if (chunkText.length > 50) {
            chunks.push({ text: chunkText, index });
            index++;
        }

        const prevStart = start;
        start = end - CHUNK_OVERLAP;
        
        // Guarantee forward progress to prevent infinite loops causing OOM
        if (start <= prevStart) {
            start = prevStart + Math.max(1, CHUNK_SIZE - CHUNK_OVERLAP);
        }
        
        if (start >= cleaned.length) break;
    }

    return chunks;
}

// ── Processing Pipeline ──────────────────────────────────────────────────────

async function processFile(filePath: string, file: string, ai: GoogleGenAI) {
    console.log(`\n── [LARGE] ${file} ──`);
    
    // 1. Extract Text
    process.stdout.write('  Extracting text into memory... ');
    const text = await extractTextFromPdf(filePath);
    if (!text) {
        console.log('SKIPPED (empty or unsupported)');
        return;
    }
    console.log(`\n  Done: ${text.length.toLocaleString()} characters`);

    // 2. Clear old run
    await clearSource(file);

    // 3. Chunk
    process.stdout.write('  Chunking text arrays... ');
    const chunks = chunkText(text);
    console.log(`\n  Generated ${chunks.length.toLocaleString()} chunks.`);

    // (Let Node handle GC natively to prevent V8 aborts)

    console.log(`\n  Starting batched embedding and storage (${PROCESS_BATCH} chunks per batch)`);
    console.log(`  This process will take time. Please do not close the terminal.\n`);

    // 4. Batch Process to Avoid OOM
    for (let i = 0; i < chunks.length; i += PROCESS_BATCH) {
        const batch = chunks.slice(i, i + PROCESS_BATCH);
        
        try {
            const results = [];
            // Sub-batch to prevent concurrent burst limits (e.g. 10 at a time)
            const SUB_BATCH = 10;
            for (let k = 0; k < batch.length; k += SUB_BATCH) {
                const subBatch = batch.slice(k, k + SUB_BATCH);
                const subResults = await Promise.all(
                    subBatch.map(chunk =>
                        ai.models.embedContent({
                            model: EMBEDDING_MODEL,
                            contents: chunk.text,
                        }).catch(err => {
                            // If we hit 429 Too Many Requests, log and return null
                            console.error(`\n    [API Error] Request failed: ${err.message}`);
                            return null;
                        })
                    )
                );
                results.push(...subResults);
                // Pause slightly between sub-batches
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Save valid embeddings to SQLite
            const validRows = [];
            for (let j = 0; j < batch.length; j++) {
                const res = results[j];
                // GoogleGenAI embedContent returns { embeddings: [{ values: [...] }] } usually, or { embedding: ... } in some SDK versions.
                // It was confirmed working in ingest.ts with `res.embeddings?.[0]?.values`
                const embeddingVals = res?.embeddings?.[0]?.values || res?.embedding?.values;
                if (embeddingVals) {
                    validRows.push({
                        text: batch[j].text,
                        embedding: embeddingVals,
                        source: file,
                        chunkIndex: batch[j].index,
                    });
                }
            }

            await storeChunksBatch(validRows);

            // Progress Bar Logging
            const progress = Math.min(i + PROCESS_BATCH, chunks.length);
            const percent = ((progress / chunks.length) * 100).toFixed(1);
            process.stdout.write(`\r  [${percent}%] Embedded and stored ${progress} / ${chunks.length} chunks`);

            // Mandatory sleep for API limits
            await new Promise(resolve => setTimeout(resolve, 800));

        } catch (e: any) {
            console.error(`\n  [Fatal Batch Error] Index ${i}:`, e.message);
            // Wait 5 seconds and resume on failure to prevent dying completely
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.log(`\n\n  ✓ Successfully ingested ${file}`);
}

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   Virtuoso Deep RAG — Large-File Ingestion   ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('✗ GEMINI_API_KEY not found.');
        process.exit(1);
    }
    const ai = new GoogleGenAI({ apiKey });

    if (!fs.existsSync(LARGE_DIR)) {
        fs.mkdirSync(LARGE_DIR, { recursive: true });
        console.log(`Created ${LARGE_DIR}. Please drop large PDFs there.`);
        process.exit(0);
    }

    const files = fs.readdirSync(LARGE_DIR).filter(f => f.endsWith('.pdf'));
    if (files.length === 0) {
        console.error('✗ No PDF files found in knowledge/_large/');
        process.exit(1);
    }

    for (const file of files) {
        const filePath = path.join(LARGE_DIR, file);
        await processFile(filePath, file, ai);
    }

    const status = await getStatus();
    console.log('\n════════════════════════════════════════════════');
    console.log(`✓ All massive files ingested!`);
    console.log(`  Total chunks in knowledge base: ${status.totalChunks.toLocaleString()}`);
    console.log('');
}

main().catch(err => {
    console.error('\n✗ Fatal pipeline crash:', err.message);
    process.exit(1);
});
