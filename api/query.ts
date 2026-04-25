import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { queryChunks } from '../src/server/knowledgeDb';

const EMBEDDING_MODEL = 'text-embedding-004';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable missing' });
  }

  try {
    const { query, topK = 5 } = req.body || {};

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing "query" string in body' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Embed the query
    const embResult = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: query,
    });

    const queryEmbedding = embResult.embeddings?.[0]?.values;
    if (!queryEmbedding) {
      return res.status(500).json({ error: 'Failed to generate query embedding' });
    }

    // Search the Supabase pgvector database
    const results = await queryChunks(queryEmbedding, topK);

    return res.status(200).json({ results });
  } catch (err: any) {
    console.error('Query error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
