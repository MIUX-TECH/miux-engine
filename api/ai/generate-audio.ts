import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSpeech } from '../_lib/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { apiKey, text, config, baseUrl, model } = req.body;

    if (!text) return res.status(400).json({ error: 'Missing text for speech generation' });

    const audioDataUri = await generateSpeech(
      apiKey || process.env.API_KEY || '',
      text,
      config || {},
      baseUrl,
      model
    );

    res.json({ audio: audioDataUri });
  } catch (error: any) {
    console.error('[API] generate-audio error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
