import { VercelRequest, VercelResponse } from '@vercel/node';
import { getStatus } from '../src/server/knowledgeDb';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const stats = getStatus();
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error('Status error:', err.message);
    return res.status(500).json({ error: 'Database not initialized or accessible' });
  }
}
