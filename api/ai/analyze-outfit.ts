import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateOutfitConcepts } from '../_lib/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { apiKey, base64, mimeType, modelType, sceneCount, chaosLevel, narrationStyle, backImage, baseUrl, model } = req.body;

    if (!base64) return res.status(400).json({ error: 'Missing base64 image data' });

    const result = await generateOutfitConcepts(
      apiKey || process.env.API_KEY || '',
      base64,
      mimeType || 'image/jpeg',
      modelType || 'Viral Cute Asian Girl (TikTok Celeb Aesthetic)',
      sceneCount || 3,
      chaosLevel || 3,
      narrationStyle || 'monolog',
      backImage || null,
      baseUrl,
      model
    );

    res.json(result);
  } catch (error: any) {
    console.error('[API] analyze-outfit error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
