import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateEditedImage } from '../_lib/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { apiKey, base64, mimeType, prompt, references, baseUrl, model } = req.body;

    if (!base64 || !prompt) return res.status(400).json({ error: 'Missing base64 image data or prompt' });

    const result = await generateEditedImage(
      apiKey || process.env.API_KEY || '',
      base64,
      mimeType || 'image/jpeg',
      prompt,
      references,
      baseUrl,
      model
    );

    res.json({ image: result });
  } catch (error: any) {
    console.error('[API] edit-image error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
