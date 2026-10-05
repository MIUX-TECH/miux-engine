import { AnalysisResponse, GenerationOptions, UGCConcept, UploadedImage } from '../types';

const API_BASE = '/api/ai';

const getClientAiConfig = () => {
  const baseUrl = (typeof window !== 'undefined' && window.localStorage)
    ? localStorage.getItem('miux_base_url') || ''
    : '';
  const model = (typeof window !== 'undefined' && window.localStorage)
    ? localStorage.getItem('miux_model') || ''
    : '';
  return { baseUrl, model };
};

export async function generateOutfitConcepts(
  apiKey: string,
  base64: string,
  mimeType: string,
  modelType: string,
  sceneCount: number,
  chaosLevel: number,
  narrationStyle: string,
  backImage?: UploadedImage | null
): Promise<AnalysisResponse> {
  const { baseUrl, model } = getClientAiConfig();
  const res = await fetch(`${API_BASE}/analyze-outfit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, base64, mimeType, modelType, sceneCount, chaosLevel, narrationStyle, backImage, baseUrl, model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}

export async function regenerateSingleConcept(
  apiKey: string,
  base64: string,
  mimeType: string,
  options: GenerationOptions,
  modelType?: string,
  chaosLevel?: number,
  backImage?: UploadedImage | null
): Promise<UGCConcept> {
  const { baseUrl, model } = getClientAiConfig();
  const res = await fetch(`${API_BASE}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, base64, mimeType, options, modelType, chaosLevel, backImage, baseUrl, model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Regeneration failed');
  }
  return res.json();
}

export async function generateEditedImage(
  apiKey: string,
  base64: string,
  mimeType: string,
  prompt: string,
  references?: UploadedImage | null
): Promise<string> {
  const { baseUrl, model } = getClientAiConfig();
  const res = await fetch(`${API_BASE}/edit-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, base64, mimeType, prompt, references, baseUrl, model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Image edit failed');
  }
  const data = await res.json();
  return data.image;
}

export async function generateSpeech(
  apiKey: string,
  text: string,
  config: any
): Promise<string> {
  const { baseUrl, model } = getClientAiConfig();
  const res = await fetch(`${API_BASE}/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, text, config, baseUrl, model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Speech generation failed');
  }
  const data = await res.json();
  return data.audio;
}

