import type { VercelRequest, VercelResponse } from '@vercel/node';
import { regenerateSingleConcept } from '../_lib/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { apiKey, base64, mimeType, options, modelType, chaosLevel, backImage, baseUrl, model } = req.body;

    if (!base64) return res.status(400).json({ error: 'Missing base64 image data' });

    const genOptions = options || {
      textOverlayMode: 'none',
      narrationMode: 'none',
      narrationStyle: 'monolog',
      sceneCount: 5
    };

    const result = await regenerateSingleConcept(
      apiKey || process.env.API_KEY || '',
      base64,
      mimeType || 'image/jpeg',
      genOptions,
      modelType,
      chaosLevel || 3,
      backImage || null,
      baseUrl,
      model
    );

    res.json(result);
  } catch (error: any) {
    console.error('[API] regenerate error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
