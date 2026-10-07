import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { AnalysisResponse, GenerationOptions, UGCConcept, ProductData, UploadedImage } from "./types.js";
import {
    pickWeightedRandom, 
    getHandPoolForModel, 
    resolveCameraMotion,
    POOL_HAND_ACTIVITY, 
    POOL_HAND_LOCATION, 
    POOL_HAND_IMPERFECTION,
    HUMAN_STYLE_POOLS,
    POOL_HUMAN_LOCATION,
    POOL_HUMAN_ACTIVITY,
    POOL_HUMAN_IMPERFECTION,
    POOL_LIGHTING_STYLES,
    POOL_CAMERA_ANGLE,
    POOL_VIDEO_ARTIFACTS,
    mapModelToStyleKey
} from "./entropyEngine.js";

// === 1. VISUAL DNA & NEGATIVE PROMPTS ===
const HYPER_REALISM_BASE = `
(RAW PHOTO, IPHONE 15 PRO MAX SNAPSHOT 9 16). style of viral tiktok photo, amateur photography style, authentic look, unedited, natural film grain.
SKIN/FACE RULES: authentic unretouched skin texture, natural skin details, imperfect lighting, raw candid photo, 4k, ultra-realistic.
DETAILS: natural hair dynamics, sharp eyes, realistic skin texture without AI smoothing. Natural beauty marks permitted.
`;

const RAW_NEGATIVE_PROMPT = `
cartoon, 3D render, anime, illustration, painting, text, watermark, logo, low quality, distorted face, bad anatomy, extra fingers,
posing, model behavior, expressive acting,
cinematic lighting, studio lighting, beauty filter, AI glow, plastic skin, skin smoothing,
perfect symmetry, airbrushed, digital art, professional photoshoot.
`;

const VIDEO_NEGATIVE_PROMPT = `
no face morphing
no extra fingers
no limb distortion
no logo distortion
no text warping
no background warping
no garment morphing
no 180 degree turn
no 360 spin
no unreferenced garment side
no camera jump
no lighting shift
no flicker
no blur pumping
no artificial glow
no beauty filter
`;

const HYPER_REALISM_VIDEO_BASE = `
(RAW VIDEO, IPHONE 15 PRO MAX FOOTAGE).
viral tiktok style, authentic kinetic realism, unedited, natural film grain, realistic fabric drape and gravity physics, no cinematic grading, no HDR look.
`;

const VIDEO_TRAINING_RULES = `
>>> VIDEO GENERATION TRAINING & KINETIC RULES <<<
- One continuous, fluid sequence per shot (4-5 seconds realistic temporal pacing).
- Realistic subject motion: organic walking stride, natural weight shift, adjusting posture, breathing, natural hand gestures, or casual interaction.
- Natural garment & fabric physics: fabric sways naturally with body stride, folds crease organically under gravity, seams and hemline respond to motion.
- CRITICAL PERSPECTIVE LOCK:
  * Strict single-perspective consistency with the scene's starting frame and active reference ('front' or 'back').
  * NEVER rotate 180° or 360° around the subject. NEVER turn the model's back to the camera if starting from the front, and vice versa.
  * If the scene shows front, camera and model stay within a frontal 35° arc. If showing back, stay exclusively on the rear angle.
- Controlled camera dynamics: smooth follow tracking, gentle push-in, low-angle stride glide, or authentic handheld micro-shake. Avoid abrupt jerky pan/tilt while zooming.
`;

// === 5. SCHEMAS ===
const visualStructureSchema = {
    type: Type.OBJECT,
    description: "Detailed visual breakdown for Image Generation. MUST BE IN ENGLISH.",
    properties: {
        subject_desc: { type: Type.STRING, description: "FULL VISUAL DESCRIPTION. Include specific details: 'authentic skin', 'natural texture', 'real lighting'." },
        action_pose: { type: Type.STRING, description: "EXACT action in ENGLISH. e.g. 'shielding eyes from light'." },
        product_placement: { type: Type.STRING, description: "Where is the product? e.g. 'worn naturally' OR 'placed on marble table'." },
        lighting_atmosphere: { type: Type.STRING, description: "Specific lighting instruction in ENGLISH." },
        camera_angle: { type: Type.STRING, description: "Specific camera angle in ENGLISH." }
    },
    required: ["subject_desc", "action_pose", "product_placement", "lighting_atmosphere", "camera_angle"]
};

const videoStructureSchema = {
    type: Type.OBJECT,
    description: "Detailed motion breakdown for Video Generation. MUST BE IN ENGLISH.",
    properties: {
        subject_movement: { type: Type.STRING, description: "Fluid, natural human kinetic motion with realistic fabric drape and gravity physics (e.g., 'Model walking forward naturally with casual cadence, jacket gently swaying with each stride, pausing at second 3 to brush hair behind ear'). KEEP SUBJECT ANGLE FACING CAMERA CONSISTENT WITH ACTIVE REFERENCE. NO 180-degree or 360-degree turns." },
        scene_atmosphere: { type: Type.STRING, description: "Lighting and mood details. e.g. 'Harsh overhead fluorescent, slight green tint, natural shadows'." },
        micro_story: { type: Type.STRING, description: "Short emotional context and kinetic intention. e.g. 'Subject is feeling confident, striding down the street, checking cuff before pausing.'" },
        camera_motion: { type: Type.STRING, description: "Specific camera movement and framing. e.g. 'Smooth eye-level tracking dolly gliding forward alongside walking subject with subtle handheld stabilization'." },
        product_placement: { type: Type.STRING, description: "How the product is shown and remains stable. e.g. 'Logo and graphic print on chest clearly visible, fabric creases responding naturally to movement'." },
        engine_safety_rules: { type: Type.STRING, description: "Specific safety rules for this scene to prevent glitches. e.g. 'Strict perspective lock matching active reference, no 180-degree turns, no garment morphing, stable lighting across frames'." }
    },
    required: ["subject_movement", "scene_atmosphere", "micro_story", "camera_motion", "product_placement", "engine_safety_rules"]
};

const conceptProperties = {
  title: { type: Type.STRING, description: "Judul konsep (Bahasa Indonesia)." },
  strategy: { type: Type.STRING, description: "Strategi (Bahasa Indonesia)." },
  viralCaption: { type: Type.STRING, description: "Caption sosmed (Bahasa Indonesia)." },
  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
  scenes: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        textOverlay: { type: Type.STRING },
        narration: { type: Type.STRING },
        voice_direction: { type: Type.STRING, description: "Instruksi cara membaca narasi (misal: nada, kecepatan, emosi)." },
        active_reference: { type: Type.STRING, description: "Pilih 'front' atau 'back' berdasarkan sisi mana yang sedang difokuskan di scene ini." },
        visual_logic: visualStructureSchema,
        video_logic: videoStructureSchema
      },
      required: ["title", "description", "textOverlay", "narration", "voice_direction", "visual_logic", "video_logic"],
    },
  },
};

const fullResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
      concepts: {
          type: Type.ARRAY,
          description: "List of EXACTLY 3 unique video concepts. Must contain exactly 3 concept items.",
          items: {
              type: Type.OBJECT,
              properties: conceptProperties,
              required: ["title", "strategy", "viralCaption", "hashtags", "scenes"]
          }
      }
  },
  required: ["concepts"]
};

const singleConceptSchema: Schema = {
  type: Type.OBJECT,
  properties: conceptProperties,
  required: ["title", "strategy", "viralCaption", "hashtags", "scenes"],
};

const productScanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        usp: { type: Type.STRING },
        targetAudience: { type: Type.STRING },
        isWearable: { type: Type.BOOLEAN },
        visualSuggestions: {
            type: Type.OBJECT,
            properties: {
                setting: { type: Type.STRING },
                lighting: { type: Type.STRING },
                mood: { type: Type.STRING },
                cameraAngle: { type: Type.STRING }
            },
            required: ["setting", "lighting", "mood", "cameraAngle"]
        }
    },
    required: ["name", "category", "usp", "targetAudience", "isWearable", "visualSuggestions"]
};

// === 6. PROMPT ASSEMBLERS ===

const getVoicePersonaPrompt = (style: string): string => {
    switch(style) {
        case 'jaksel':
            return "Gaya Narasi: Anak Jaksel (Trendy & Campur Inggris). Gunakan kata-kata seperti 'literally', 'which is', 'jujurly', 'vibes'. Nada bicara santai tapi flexing.";
        case 'reviewer':
            return "Gaya Narasi: Reviewer Jujur (Sarkas & To-the-point). Kritis, tidak basa-basi, fokus pada detail material/jahitan/kualitas. Nada bicara tegas dan sedikit galak.";
        case 'asmr':
            return "Gaya Narasi: Soft Girl ASMR (Berbisik & Estetik). Sangat pelan, fokus pada suara gesekan material, gunakan kata-kata puitis/lembut dan menenangkan.";
        case 'hype':
            return "Gaya Narasi: Hypebeast / Streetwear Bro (Energetik). Cepat, agresif, gunakan kata 'Bro', 'Gils', 'Cop or Drop', 'Sumpah ini keren banget'.";
        case 'sales':
            return "Gaya Narasi: Sales SPG (Hard Selling & Ramah). Fokus jualan, gunakan kata 'Kakak', 'Promo', 'Checkout sekarang', 'Jangan sampai kehabisan'.";
        case 'storytime':
            return "Gaya Narasi: Storytime (Curhat TikTok). Dimulai dengan 'Get ready with me sambil cerita...' atau 'Sumpah kalian harus tau...'. Mengalir seperti sedang bercerita ke teman dekat.";
        case 'monolog':
        default:
            return "Gaya Narasi: Monolog (Satu Suara). Natural, informatif, dan engaging seperti kreator TikTok pada umumnya.";
    }
};

const assembleImagePrompt = (logic: any, fallbackDesc?: string): string => {
    const l = logic || {};
    const subject = l.subject_desc || fallbackDesc || 'Authentic candid lifestyle photo';
    const action = l.action_pose || 'Natural relaxed pose';
    const product = l.product_placement || 'Worn or placed naturally';
    const lighting = l.lighting_atmosphere || 'Natural ambient lighting';
    const angle = l.camera_angle || 'Eye-level handheld snapshot';

    return `${HYPER_REALISM_BASE}
Subject: ${subject}
Action: ${action}
Product: ${product}
Lighting: ${lighting}
Angle: ${angle}`.trim();
};

export const assembleVideoPrompt = (logic: any, videoArtifacts: string, isCinematic: boolean, fallbackDesc?: string, activeReference?: string): string => {
    const l = logic || {};
    const subject = l.subject_desc || fallbackDesc || 'Authentic candid subject';
    const movement = l.subject_movement || 'Natural walking cadence and subtle garment fabric sway';
    const product = l.product_placement || 'Worn naturally with clear fabric drape and details';
    const scene = l.scene_atmosphere || 'Natural ambient lighting';
    const camera = l.camera_motion || 'Smooth eye-level handheld glide pacing alongside subject';
    const rules = l.engine_safety_rules || 'strict single-perspective lock, no 180-degree turns, stable lighting across frames';
    const ref = (activeReference === 'back') ? 'BACK / REAR PERSPECTIVE ONLY' : 'FRONTAL / THREE-QUARTER PERSPECTIVE ONLY';

    return `${HYPER_REALISM_VIDEO_BASE}

SUBJECT:
${subject}

ACTION & KINETIC DYNAMICS:
${movement}

PRODUCT & FABRIC PHYSICS:
${product}

LIGHTING & SCENE ATMOSPHERE:
${scene}

CAMERA MOTION & FRAMING:
${camera}

VISUAL TEXTURE & CAMERA ARTIFACTS:
- Artifacts: ${videoArtifacts}
- Camera Dynamics: ${isCinematic ? "Smooth cinematic stabilization and subtle glide" : "Natural handheld micro-shake with authentic amateur POV feel"}

PERSPECTIVE LOCK & ENGINE SAFETY RULES:
- Active Angle: ${ref}
- Strict single-perspective consistency with initial frame.
- NO 180-degree or 360-degree body turns; never expose unreferenced garment sides.
- Pacing: Organic 4-5 second realistic temporal dynamics (cadence, fabric drape, gravity response).
- Keep lighting and color grading strictly consistent across all frames; no flicker.
- ${rules}

NEGATIVE PROMPT:
${VIDEO_NEGATIVE_PROMPT}`.trim();
};

export const sanitizeHashtags = (raw: any): string[] => {
    if (!raw) return [];
    let tags: string[] = [];
    if (Array.isArray(raw)) {
        tags = raw.flatMap(t => typeof t === 'string' ? t.split(/[\s,]+/) : []);
    } else if (typeof raw === 'string') {
        tags = raw.split(/[\s,]+/);
    }
    return tags
        .map(t => String(t).trim().replace(/^#+/, ''))
        .filter(t => t.length > 0);
};

export const processConcept = (concept: any, options: GenerationOptions, videoArtifacts?: string, locationDesc?: string, chaosLevel: number = 3): UGCConcept => {
  if (!concept || !Array.isArray(concept.scenes)) {
      return concept ? { ...concept, hashtags: sanitizeHashtags(concept.hashtags) } : { title: "", strategy: "", viralCaption: "", hashtags: [], scenes: [] };
  }

  const processedScenes = concept.scenes.map((scene: any) => {
    const visualLogic = scene.visual_logic || null;
    const videoLogic = scene.video_logic || null;

    if (visualLogic && videoLogic && !videoLogic.subject_desc) {
        // Fallback to visual_logic if video_logic doesn't have a specific subject description
        videoLogic.subject_desc = visualLogic.subject_desc;
    }

    const compiledImagePrompt = assembleImagePrompt(visualLogic, scene.description || scene.title);

    // Dynamically resolve camera motion per scene if not provided by Gemini, or use Gemini's if valid
    let sceneCamera = videoLogic?.camera_motion;
    let isCinematic = false;

    if (!sceneCamera || sceneCamera.trim() === "") {
        const resolved = resolveCameraMotion(locationDesc || videoLogic?.scene_atmosphere || scene.description || "", chaosLevel);
        sceneCamera = resolved.label;
        isCinematic = resolved.isCinematic;
    } else {
        isCinematic = sceneCamera.toLowerCase().includes('cinematic') || sceneCamera.toLowerCase().includes('smooth') || sceneCamera.toLowerCase().includes('tracking');
    }

    const artifacts = videoArtifacts || "Slight motion blur";
    const activeRef = scene.active_reference || 'front';
    const compiledVideoPrompt = assembleVideoPrompt(videoLogic, artifacts, isCinematic, scene.description || scene.title, activeRef);

    const newScene = {
        ...scene,
        imageEditPrompt: compiledImagePrompt,
        videoGenPrompt: compiledVideoPrompt
    };
    delete newScene.visual_logic;
    delete newScene.video_logic;
    return newScene;
  });
  return {
      ...concept,
      hashtags: sanitizeHashtags(concept.hashtags),
      scenes: processedScenes
  };
};

export interface AiSettings {
    baseUrl: string;
    model: string;
    apiKey: string;
}

export const getAiSettings = (): AiSettings => {
    const baseUrl = process.env.AI_BASE_URL || '';
    const apiKey = process.env.API_KEY || process.env.VITE_9ROUTER_API_KEY || '';
    let model = process.env.AI_MODEL || (baseUrl ? 'ag/gemini-3.7-flash-medium' : 'auto');

    // Auto-normalize legacy or shorthand models
    if (model === 'ag/gemini-3.7-flash' || model === 'gemini-3.7-flash') {
        model = baseUrl ? 'ag/gemini-3.7-flash-medium' : 'auto';
    }

    return { baseUrl, model, apiKey };
};

export const parseApiKeys = (input?: string): string[] => {
    if (!input) return [];
    const list = input
        .split(/[\n,;]+/)
        .map(k => k.trim().replace(/^Bearer\s+/i, ''))
        .filter(k => k.length > 0);
    return Array.from(new Set(list));
};

let globalKeyIndex = 0;
let globalModelIndex = 0;

// All verified Google AI Studio models supporting multimodal vision + structured JSON output
const GOOGLE_STUDIO_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.1-flash-lite-preview',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-2.5-pro'
];

const PROXY_ROUTER_MODELS = [
    'ag/gemini-3.8-flash-high',
    'ag/gemini-3.8-flash-medium',
    'ag/gemini-3.7-flash-medium',
    'ag/gemini-3.8-flash',
    'ag/gemini-pro-agent'
];

export const executeWithKeyPool = async <T>(
    explicitKey: string | undefined,
    operation: (ai: GoogleGenAI, model: string, key: string) => Promise<T>,
    options?: {
        baseUrl?: string;
        preferredModel?: string;
        isImageGeneration?: boolean;
        isAudioGeneration?: boolean;
    }
): Promise<T> => {
    const settings = getAiSettings();
    const userKeys = parseApiKeys(explicitKey);
    const envKeys = parseApiKeys(settings.apiKey);
    const keys = userKeys.length > 0 ? userKeys : envKeys;

    if (keys.length === 0) {
        throw new Error("API Key tidak ditemukan. Silakan masukkan API Key Google AI Studio di Pengaturan.");
    }

    const effectiveBaseUrl = (options?.baseUrl !== undefined && options.baseUrl !== null && options.baseUrl.trim() !== '')
        ? options.baseUrl.trim()
        : settings.baseUrl;

    // Determine candidate models with automatic rotation & failover
    let candidateModels: string[] = [];
    if (options?.isImageGeneration) {
        const imageModels = ['imagen-3.0-generate-002', 'gemini-3.1-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'];
        const startImgIdx = globalModelIndex % imageModels.length;
        candidateModels = [...imageModels.slice(startImgIdx), ...imageModels.slice(0, startImgIdx)];
    } else if (options?.isAudioGeneration) {
        const audioModels = effectiveBaseUrl
            ? ['ag/gemini-3.8-flash-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts']
            : ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];
        const startAudIdx = globalModelIndex % audioModels.length;
        candidateModels = [...audioModels.slice(startAudIdx), ...audioModels.slice(0, startAudIdx)];
    } else {
        const isAuto = !options?.preferredModel || options.preferredModel === 'auto' || options.preferredModel === '';

        if (effectiveBaseUrl) {
            const startProxyIdx = globalModelIndex % PROXY_ROUTER_MODELS.length;
            const rotatedProxy = [...PROXY_ROUTER_MODELS.slice(startProxyIdx), ...PROXY_ROUTER_MODELS.slice(0, startProxyIdx)];
            candidateModels = (!isAuto && options?.preferredModel)
                ? [options.preferredModel, ...rotatedProxy]
                : rotatedProxy;
        } else {
            // Google AI Studio: rotate starting model smoothly across all available models
            const startGoogleIdx = globalModelIndex % GOOGLE_STUDIO_MODELS.length;
            const rotatedGoogle = [...GOOGLE_STUDIO_MODELS.slice(startGoogleIdx), ...GOOGLE_STUDIO_MODELS.slice(0, startGoogleIdx)];
            candidateModels = (!isAuto && options?.preferredModel && !GOOGLE_STUDIO_MODELS.includes(options.preferredModel))
                ? [options.preferredModel, ...rotatedGoogle]
                : rotatedGoogle;
        }
    }
    candidateModels = Array.from(new Set(candidateModels.filter(Boolean)));

    // Increment global rotation index for next call
    globalModelIndex = (globalModelIndex + 1) % 10000;

    // Round-robin key rotation
    const startIdx = globalKeyIndex % keys.length;
    globalKeyIndex = (globalKeyIndex + 1) % keys.length;
    const prioritizedKeys = [...keys.slice(startIdx), ...keys.slice(0, startIdx)];

    let attemptedErrors: string[] = [];

    for (let ki = 0; ki < prioritizedKeys.length; ki++) {
        const currentKey = prioritizedKeys[ki];
        const maskedKey = currentKey.length > 12
            ? `${currentKey.substring(0, 8)}...${currentKey.substring(currentKey.length - 4)}`
            : currentKey;

        for (let mi = 0; mi < candidateModels.length; mi++) {
            const currentModel = candidateModels[mi];
            try {
                const clientConfig: any = { apiKey: currentKey };
                if (effectiveBaseUrl) {
                    const cleanBaseUrl = effectiveBaseUrl.replace(/\/+$/, '');
                    clientConfig.httpOptions = {
                        baseUrl: cleanBaseUrl,
                        headers: {
                            'Authorization': `Bearer ${currentKey}`
                        }
                    };
                }
                const ai = new GoogleGenAI(clientConfig);
                return await operation(ai, currentModel, currentKey);
            } catch (err: any) {
                const status = err.status || err.statusCode;
                const msg = err.message || String(err);
                const logTag = `[KeyPool ${ki + 1}/${prioritizedKeys.length} (${maskedKey}) | Model: ${currentModel}]`;
                attemptedErrors.push(`${logTag} -> ${status || 'ERR'}: ${msg.substring(0, 150)}`);
                console.warn(`${logTag} Error:`, status || '', msg.substring(0, 150));

                const isKeyAuthError = status === 401 ||
                                       msg.includes('API_KEY_INVALID') ||
                                       msg.includes('Invalid API key') ||
                                       msg.includes('invalid_api_key');

                const isProjectDenied = status === 403 ||
                                        msg.includes('denied access') ||
                                        msg.includes('PERMISSION_DENIED');

                const isKeyQuotaExhausted = status === 429 ||
                                            msg.includes('RESOURCE_EXHAUSTED') ||
                                            msg.includes('insufficient_quota');

                // If key is definitely invalid or denied access, skip remaining models for this key immediately
                if (isKeyAuthError || isProjectDenied || (isKeyQuotaExhausted && prioritizedKeys.length > 1)) {
                    break;
                }
            }
        }
    }

    const detailedErr = attemptedErrors.join('\n');
    console.error("[KeyPool Exhausted] Semua kombinasi API Key & Model gagal:\n" + detailedErr);

    let userFriendlyMsg = "Semua kombinasi model dan API Key gagal.";
    if (detailedErr.includes("denied access") || detailedErr.includes("403")) {
        userFriendlyMsg = "Akses ditolak (HTTP 403 - Project denied access). API Key Google AI Studio Anda ditolak atau project dinonaktifkan. Silakan buat API Key baru gratis di https://aistudio.google.com/app/apikey.";
    } else if (detailedErr.includes("API_KEY_INVALID") || detailedErr.includes("401")) {
        userFriendlyMsg = "API Key tidak valid (HTTP 401). Silakan periksa kembali API Key Google AI Studio di Pengaturan.";
    } else if (detailedErr.includes("RESOURCE_EXHAUSTED") || detailedErr.includes("429")) {
        userFriendlyMsg = "Batas kuota API tercapai (HTTP 429 - Quota Exceeded). Silakan coba lagi beberapa saat lagi atau tambahkan API Key cadangan di Pengaturan.";
    } else if (detailedErr.includes("404")) {
        userFriendlyMsg = "Model tidak ditemukan (HTTP 404). Sistem sedang merotasi ke model lain secara otomatis.";
    }

    throw new Error(`${userFriendlyMsg}\n\nRincian error:\n${detailedErr}`);
};

export const getGenAIClient = (explicitKey?: string) => {
    const settings = getAiSettings();
    const keys = parseApiKeys(explicitKey || settings.apiKey);
    const key = keys[0] || '';
    const clientConfig: any = { apiKey: key };

    if (settings.baseUrl && settings.baseUrl.trim() !== '') {
        const cleanBaseUrl = settings.baseUrl.replace(/\/+$/, '');
        clientConfig.httpOptions = {
            baseUrl: cleanBaseUrl,
            headers: {
                'Authorization': `Bearer ${key}`
            }
        };
    }

    return { client: new GoogleGenAI(clientConfig), model: settings.model };
};

const cleanJsonString = (text: string): string => {
    let clean = text.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return clean;
};

const safeJsonParse = (text: string, fallback: any = {}) => {
    try {
        return JSON.parse(cleanJsonString(text));
    } catch (error) {
        console.warn("JSON Parsing failed. Attempting recovery with regex...", error);
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
        } catch (e) {
            console.error("Recovery failed.", e);
        }
        return fallback;
    }
};

// === 7. AUDIO HELPERS ===
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Uint8Array => {
    const headerLength = 44;
    const dataLength = pcmData.length;
    const fileSize = dataLength + headerLength - 8;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    const headerBytes = new Uint8Array(buffer, 0, headerLength);
    const finalBuffer = new Uint8Array(headerLength + dataLength);
    finalBuffer.set(headerBytes);
    finalBuffer.set(pcmData, headerLength);
    return finalBuffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// === PUBLIC API METHODS ===

export const analyzeProductImageOnly = async (
    apiKey: string,
    base64Image: string,
    mimeType: string,
    baseUrl?: string,
    preferredModel?: string
): Promise<ProductData> => {
    try {
        const response: GenerateContentResponse = await executeWithKeyPool(apiKey, async (ai, model) => {
            return await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Image } },
                        { text: "Analyze product. Output raw JSON format in Bahasa Indonesia following product schema. Return JSON only." }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: productScanSchema
                }
            });
        }, { baseUrl, preferredModel });
        const data = safeJsonParse(response.text || "{}");
        return { ...data, promo: "" };
    } catch (e) {
        throw e;
    }
};

/**
 * GENERATE OUTFIT CONCEPTS (UPDATED WITH ENTROPY ENGINE)
 */
export const generateOutfitConcepts = async (
    apiKey: string,
    base64Image: string,
    mimeType: string,
    modelType: string, // User Selection
    sceneCount: number = 3,
    chaosLevel: number = 3, // New: Chaos Intensity (1-5)
    narrationStyle: string = 'monolog',
    backImage?: UploadedImage | null,
    baseUrl?: string,
    preferredModel?: string
): Promise<AnalysisResponse> => {
    try {
        const recentPicks = new Set<string>();
        
        // 1. ANALYZE MODEL TYPE & GENERATE RANDOM ATTRIBUTES
        const lowerType = modelType.toLowerCase();
        const isProductOnly = lowerType.includes('review') || lowerType.includes('hands only');
        const isFacelessBody = lowerType.includes('faceless') || lowerType.includes('body only');

        let coreStyle = "";
        let negativePrompt = RAW_NEGATIVE_PROMPT;
        if (isProductOnly) {
            coreStyle = `FOCUS: PRODUCT DETAILS & HANDS ONLY. NO FACES. NO FULL BODY.`;
            negativePrompt += ` face, head, eyes, mouth, human body, full body, cinematic, studio lighting, perfect composition.`;
        } else if (isFacelessBody) {
            coreStyle = `TARGET FRAMING: FACELESS / BODY ONLY. The model MUST WEAR the product. Keep camera framed neck-down, chin cropped out, or headless torso angle. Focus on outfit drape, silhouette, and fabric motion.`;
            negativePrompt += ` face, head, eyes, mouth, smiling face, portrait, headshot.`;
        } else {
            coreStyle = `TARGET MODEL BASE: "${modelType}"`;
        }

        // Video specific chaos (capped at level 3 for safety)
        const videoChaosLevel = Math.min(chaosLevel, 3);

        interface ConceptEntropy {
            conceptNum: number;
            videoArtifacts: { label: string };
            coreCameraAngle: { label: string };
            selectedLocationDesc: string;
            promptBlock: string;
        }

        const sampleConceptEntropy = (conceptNum: number): ConceptEntropy => {
            const videoArtifacts = pickWeightedRandom(POOL_VIDEO_ARTIFACTS, videoChaosLevel);
            const coreCameraAngle = pickWeightedRandom(POOL_CAMERA_ANGLE, chaosLevel, true, recentPicks);

            if (isProductOnly) {
                const coreHand = pickWeightedRandom(getHandPoolForModel(modelType || ""), chaosLevel, true, recentPicks);
                const coreActivity = pickWeightedRandom(POOL_HAND_ACTIVITY, chaosLevel, true, recentPicks);
                const coreLocation = pickWeightedRandom(POOL_HAND_LOCATION, chaosLevel, true, recentPicks);
                const selectedLocationDesc = `${coreLocation.name} ${coreLocation.desc}`;

                const overlayImperfections: string[] = [];
                if (chaosLevel >= 3) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks).label);
                if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks).label);
                if (chaosLevel === 5) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks).label);

                const promptBlock = `
            >>> KONSEP ${conceptNum} VISUAL LOCK (POOL KHUSUS KONSEP ${conceptNum}) <<<
            - Hand Detail: ${coreHand.label}
            - Location & Environment: ${coreLocation.name} (${coreLocation.desc})
            - Lighting: ${coreLocation.lighting || 'Natural Ambient Light'}
            - Activity: ${coreActivity.label}
            - Camera Angle: ${coreCameraAngle.label}
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "None (Clean)"}
            - Video Motion Artifact: ${videoArtifacts.label}
            `;
                return { conceptNum, videoArtifacts, coreCameraAngle, selectedLocationDesc, promptBlock };
            } else if (isFacelessBody) {
                const styleKey = mapModelToStyleKey(modelType);
                const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['FACELESS_BODY'];
                const coreFraming = pickWeightedRandom(variations, chaosLevel, true, recentPicks);
                const coreLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel, true, recentPicks);
                const coreActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel, true, recentPicks);
                const selectedLocationDesc = `${coreLocation.name} ${coreLocation.desc}`;

                const overlayImperfections: string[] = [];
                if (chaosLevel >= 2) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
                if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
                if (chaosLevel === 5) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);

                const promptBlock = `
            >>> KONSEP ${conceptNum} VISUAL LOCK (POOL KHUSUS KONSEP ${conceptNum}) <<<
            - Framing & Silhouette: ${coreFraming.label}
            - Location & Environment: ${coreLocation.name} (${coreLocation.desc})
            - Lighting: ${coreLocation.lighting || 'Natural Ambient Light'}
            - Activity: ${coreActivity.label}
            - Vibe: ${coreLocation.vibe}
            - Camera Angle: ${coreCameraAngle.label}
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "Clean (Level 1)"}
            - Video Motion Artifact: ${videoArtifacts.label}
            `;
                return { conceptNum, videoArtifacts, coreCameraAngle, selectedLocationDesc, promptBlock };
            } else {
                const styleKey = mapModelToStyleKey(modelType);
                const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['TIKTOK_GIRL'];
                const coreLook = pickWeightedRandom(variations, chaosLevel, true, recentPicks);
                const coreLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel, true, recentPicks);
                const coreActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel, true, recentPicks);
                const selectedLocationDesc = `${coreLocation.name} ${coreLocation.desc}`;

                const overlayImperfections: string[] = [];
                if (chaosLevel >= 2) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
                if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
                if (chaosLevel === 5) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);

                const promptBlock = `
            >>> KONSEP ${conceptNum} VISUAL LOCK (POOL KHUSUS KONSEP ${conceptNum}) <<<
            - Look & Aesthetic: ${coreLook.label}
            - Location & Environment: ${coreLocation.name} (${coreLocation.desc})
            - Lighting: ${coreLocation.lighting || 'Natural Ambient Light'}
            - Activity: ${coreActivity.label}
            - Vibe: ${coreLocation.vibe}
            - Camera Angle: ${coreCameraAngle.label}
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "Clean (Level 1)"}
            - Video Motion Artifact: ${videoArtifacts.label}
            `;
                return { conceptNum, videoArtifacts, coreCameraAngle, selectedLocationDesc, promptBlock };
            }
        };

        const conceptEntropies = [
            sampleConceptEntropy(1),
            sampleConceptEntropy(2),
            sampleConceptEntropy(3),
        ];

        const voicePersona = getVoicePersonaPrompt(narrationStyle);

        const outfitRule = isProductOnly ? `
        CRITICAL PRODUCT RULE:
        The user's PRODUCT is the absolute priority. Focus entirely on the texture, details, and material of the product. The product should be held, touched, or placed in the scene. DO NOT put the product on a human body. DO NOT describe a person wearing the product.` : `
        CRITICAL OUTFIT RULE:
        The user's PRODUCT is the absolute priority. If the product is a piece of clothing (shirt, jacket, dress, pants), the model MUST wear it as their primary outfit. If the 'Core Look' from the engine suggests a conflicting outfit (e.g., Engine suggests 'Batik Shirt' but Product is 'Denim Jacket', or Engine suggests 'Mukena' but Product is 'T-Shirt'), you MUST adapt the Core Look. Do NOT cover the product. Instead, turn the conflicting Core Look item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned to reveal the product underneath).`;

        const parts: any[] = [
            { inlineData: { mimeType, data: base64Image } }
        ];

        let backImageContext = "";
        if (backImage) {
            parts.push({ inlineData: { mimeType: backImage.mimeType, data: backImage.base64 } });
            backImageContext = `
            - PENTING (DUAL IMAGE REFERENCE): Anda menerima 2 gambar referensi. Gambar pertama adalah tampak DEPAN ('front'), gambar kedua adalah tampak BELAKANG ('back').
            - Buatlah variasi scene yang menampilkan kedua sisi produk secara logis dan proporsional.
            - ATURAN MUTLAK PERSPECTIVE LOCK:
              * Isi kolom 'active_reference' dengan 'front' (jika scene menyorot sisi depan) ATAU 'back' (jika scene menyorot sisi belakang).
              * Setiap scene HANYA berfokus pada 1 sudut pandang sesuai active_reference. DILARANG memutar kamera 180°/360° atau menampilkan sisi yang tidak ada di foto referensi frame awal!
            `;
        }

        const promptText = `
        ROLE: Viral TikTok Visual Director (Specialist in 'Ugly-Chic' & Flash Photography).
        TASK: Create EXACTLY 3 distinct Video Concepts (each having ${sceneCount} scenes) based on the uploaded image(s). All 3 concepts must be included in the "concepts" array.
        ${backImageContext}

        ${coreStyle}

        >>> STRICT DISTINCT VISUAL & POOL LOCKS (EACH CONCEPT MUST USE ITS ASSIGNED POOL) <<<
        PENTING: Setiap konsep (1, 2, 3) HARUS menggunakan pool visual, lokasi, aktivitas, dan vibe yang BERBEDA sesuai pembagian di bawah ini. JANGAN mencampuradukkan lokasi antar konsep!

        ${conceptEntropies.map(c => c.promptBlock).join("\n")}

        CRITICAL VISUAL INSTRUCTIONS:
        - Hair and makeup should match the requested vibe (can be messy or neat, but must look real).
        - Eyes must be sharp but natural.
        - Background must feel like a real, lived-in space.

        >>> YOUR JOB (COPYWRITING, SCENE BREAKDOWN & STRATEGY) <<<
        - Tulis 'title': Judul konsep yang singkat, catchy, dan relevan (Bahasa Indonesia).
        - Tulis 'strategy': PENJELASAN SINGKAT per konsep (Bahasa Indonesia, 1-2 kalimat padat menjelaskan angle marketing & alasan konsep ini bekerja).
        - Untuk setiap scene:
          * Tulis 'title': Judul scene singkat (Bahasa Indonesia).
          * Tulis 'description': PENJELASAN SINGKAT visual scene (Bahasa Indonesia, 1-2 kalimat ringkas menjelaskan apa yang terjadi di layar).
          * Tulis 'textOverlay': Teks hook ringkas di layar (Bahasa Indonesia).
          * Tulis 'narration': Naskah narasi/voiceover singkat & natural (Bahasa Indonesia).
          * Tulis 'voice_direction': Arahan intonasi dan gaya vokal membaca narasi.
          * Isi 'visual_logic' (in ENGLISH) dengan breakdown visual terkunci sesuai pool konsepnya masing-masing:
            - subject_desc: Full visual subject description in English matching the assigned concept's look/talent.
            - action_pose: Exact action in English matching the assigned concept's activity.
            - product_placement: Where and how the product is shown in English.
            - lighting_atmosphere: Specific lighting and atmosphere in English matching the assigned concept's location.
            - camera_angle: Specific camera angle in English matching the assigned concept's camera angle.
          * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas:
            - subject_movement: Fluid, natural human kinetic motion with realistic fabric drape in English (strictly matching active_reference angle).
            - scene_atmosphere: Environmental motion matching the assigned concept's location in English.
            - micro_story: Short emotional context in English.
            - camera_motion: Specific mathematical camera movement in English.
            - product_placement: How product remains stable and sharp in English.
            - engine_safety_rules: Safety rules in English.

        >>> AUDIO & NARRATION INSTRUCTIONS <<<
        ${voicePersona}
        - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
        - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

        ${outfitRule}

        ${VIDEO_TRAINING_RULES}

        ${negativePrompt}

        OUTPUT RULES:
        1. **Concept Count (CRITICAL)**: You MUST ALWAYS generate EXACTLY 3 unique video concepts (Concept 1, Concept 2, and Concept 3) in the "concepts" array. NEVER return only 1 or 2 concepts. The "concepts" array length MUST BE EXACTLY 3.
        2. **Distinct Pools Per Concept (CRITICAL)**:
           - All scenes in Concept 1 MUST strictly follow KONSEP 1 VISUAL LOCK (Location 1, Activity 1, Camera Angle 1).
           - All scenes in Concept 2 MUST strictly follow KONSEP 2 VISUAL LOCK (Location 2, Activity 2, Camera Angle 2 - DIFFERENT pool from Concept 1).
           - All scenes in Concept 3 MUST strictly follow KONSEP 3 VISUAL LOCK (Location 3, Activity 3, Camera Angle 3 - DIFFERENT pool from Concept 1 & 2).
           - Within each concept, the location and visual vibe must remain consistent across its ${sceneCount} scenes.
        3. **Scene Count**: Exactly ${sceneCount} scenes per concept.
        4. **Language Rules**:
           - Judul konsep, strategi (penjelasan singkat konsep 1-2 kalimat), deskripsi scene (penjelasan singkat visual scene 1-2 kalimat), textOverlay, narasi: **BAHASA INDONESIA**.
           - visual_logic dan video_logic: **ENGLISH**.
        5. **Visual Consistency**: ALWAYS USE THE LOCKED VISUALS ABOVE. DO NOT change location within the same concept.
        6. **Realism**: Prompt must mention 'iPhone 15 Pro Max', 'Noise', 'Unedited'.
        7. **Hashtags**: Provide EXACTLY 5 relevant hashtags per concept WITHOUT the '#' symbol (e.g. ["ootd", "outfitinspo", "tiktokfashion", "style", "racuntiktok"]).

        OUTPUT FORMAT (STRICT RAW JSON ONLY):
        {
          "concepts": [
            {
              "title": "Konsep 1: Judul Konsep Pertama (Bahasa Indonesia)",
              "strategy": "Penjelasan singkat strategi & angle marketing konsep 1 (Bahasa Indonesia, 1-2 kalimat)",
              "viralCaption": "Caption media sosial konsep 1 yang engaging",
              "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
              "scenes": [
                {
                  "title": "Judul Scene (Bahasa Indonesia)",
                  "description": "Penjelasan singkat visual scene (Bahasa Indonesia, 1-2 kalimat)",
                  "textOverlay": "Teks singkat di layar video",
                  "narration": "Naskah narasi/voiceover singkat",
                  "voice_direction": "Instruksi intonasi vokal",
                  "active_reference": "front",
                  "visual_logic": {
                    "subject_desc": "Detailed visual description of subject in English matching the locked look",
                    "action_pose": "Exact action in English",
                    "product_placement": "Product placement in English",
                    "lighting_atmosphere": "Lighting instruction in English",
                    "camera_angle": "Camera angle in English"
                  },
                  "video_logic": {
                    "subject_movement": "Natural kinetic motion with fabric drape in English",
                    "scene_atmosphere": "Scene atmosphere in English",
                    "micro_story": "Short emotional context in English",
                    "camera_motion": "Camera motion in English",
                    "product_placement": "Product stability description in English",
                    "engine_safety_rules": "Safety rules in English"
                  }
                }
              ]
            },
            {
              "title": "Konsep 2: Judul Konsep Kedua (Bahasa Indonesia)",
              "strategy": "Penjelasan singkat strategi & angle marketing konsep 2 (Bahasa Indonesia, 1-2 kalimat)",
              "viralCaption": "Caption media sosial konsep 2 yang engaging",
              "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
              "scenes": [
                {
                  "title": "Judul Scene (Bahasa Indonesia)",
                  "description": "Penjelasan singkat visual scene (Bahasa Indonesia, 1-2 kalimat)",
                  "textOverlay": "Teks singkat di layar video",
                  "narration": "Naskah narasi/voiceover singkat",
                  "voice_direction": "Instruksi intonasi vokal",
                  "active_reference": "front",
                  "visual_logic": {
                    "subject_desc": "Detailed visual description of subject in English matching the locked look",
                    "action_pose": "Exact action in English",
                    "product_placement": "Product placement in English",
                    "lighting_atmosphere": "Lighting instruction in English",
                    "camera_angle": "Camera angle in English"
                  },
                  "video_logic": {
                    "subject_movement": "Natural kinetic motion with fabric drape in English",
                    "scene_atmosphere": "Scene atmosphere in English",
                    "micro_story": "Short emotional context in English",
                    "camera_motion": "Camera motion in English",
                    "product_placement": "Product stability description in English",
                    "engine_safety_rules": "Safety rules in English"
                  }
                }
              ]
            },
            {
              "title": "Konsep 3: Judul Konsep Ketiga (Bahasa Indonesia)",
              "strategy": "Penjelasan singkat strategi & angle marketing konsep 3 (Bahasa Indonesia, 1-2 kalimat)",
              "viralCaption": "Caption media sosial konsep 3 yang engaging",
              "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
              "scenes": [
                {
                  "title": "Judul Scene (Bahasa Indonesia)",
                  "description": "Penjelasan singkat visual scene (Bahasa Indonesia, 1-2 kalimat)",
                  "textOverlay": "Teks singkat di layar video",
                  "narration": "Naskah narasi/voiceover singkat",
                  "voice_direction": "Instruksi intonasi vokal",
                  "active_reference": "front",
                  "visual_logic": {
                    "subject_desc": "Detailed visual description of subject in English matching the locked look",
                    "action_pose": "Exact action in English",
                    "product_placement": "Product placement in English",
                    "lighting_atmosphere": "Lighting instruction in English",
                    "camera_angle": "Camera angle in English"
                  },
                  "video_logic": {
                    "subject_movement": "Natural kinetic motion with fabric drape in English",
                    "scene_atmosphere": "Scene atmosphere in English",
                    "micro_story": "Short emotional context in English",
                    "camera_motion": "Camera motion in English",
                    "product_placement": "Product stability description in English",
                    "engine_safety_rules": "Safety rules in English"
                  }
                }
              ]
            }
          ]
        }
        Return ONLY valid JSON matching this schema. No markdown code fences, no conversational text.
        `;

        const response: GenerateContentResponse = await executeWithKeyPool(apiKey, async (ai, model) => {
            return await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        ...parts,
                        { text: promptText }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: fullResponseSchema,
                    systemInstruction: "You are an AI that creates HYPER-REALISTIC, imperfect, candid content. You hate 'AI-look'. You love 'Raw TikTok' look.",
                },
            });
        }, { baseUrl, preferredModel });

        const parsed = safeJsonParse(response.text || "{}");
        let conceptsList: any[] = [];
        if (Array.isArray(parsed)) {
            conceptsList = parsed;
        } else if (parsed.concepts && Array.isArray(parsed.concepts)) {
            conceptsList = parsed.concepts;
        } else if (parsed.scenes && Array.isArray(parsed.scenes)) {
            conceptsList = [parsed];
        }

        const data: AnalysisResponse = { concepts: conceptsList };

        const options: GenerationOptions = { textOverlayMode: 'none', narrationMode: 'none', narrationStyle: narrationStyle, sceneCount };

        // Pass each concept's respective selectedLocationDesc and videoArtifacts to processConcept
        data.concepts = data.concepts.map((c, idx) => {
            const entropy = conceptEntropies[idx] || conceptEntropies[0];
            return processConcept(c, options, entropy.videoArtifacts.label, entropy.selectedLocationDesc, videoChaosLevel);
        });

        return data;

    } catch (error) {
        console.error("Error generating Outfit prompts:", error);
        throw error;
    }
};

/**
 * REGENERATE SINGLE CONCEPT (ADAPTED FOR REALISM & CHAOS)
 */
export const regenerateSingleConcept = async (
    apiKey: string,
    base64Image: string,
    mimeType: string,
    options: GenerationOptions,
    modelType?: string,
    chaosLevel: number = 3, // Add Chaos Level Parameter
    backImage?: UploadedImage | null,
    baseUrl?: string,
    preferredModel?: string
): Promise<UGCConcept> => {
  try {
    const recentPicks = new Set<string>();
    
    let specificPrompt = "";
    let negativePrompt = RAW_NEGATIVE_PROMPT;
    let selectedLocationDesc = "";
    
    const videoChaosLevel = Math.min(chaosLevel, 3);
    const videoArtifacts = pickWeightedRandom(POOL_VIDEO_ARTIFACTS, videoChaosLevel);
    const coreCameraAngle = pickWeightedRandom(POOL_CAMERA_ANGLE, chaosLevel, true, recentPicks);

    if (modelType) {
        const lowerType = modelType.toLowerCase();
        const isProductOnly = lowerType.includes('review') || lowerType.includes('hands');
        const isFacelessBody = lowerType.includes('faceless') || lowerType.includes('body only');
        const voicePersona = getVoicePersonaPrompt(options.narrationStyle || 'monolog');

        if (isProductOnly) {
             const hand = pickWeightedRandom(getHandPoolForModel(modelType || ""), chaosLevel, true, recentPicks);
             const activity = pickWeightedRandom(POOL_HAND_ACTIVITY, chaosLevel, true, recentPicks);
             const location = pickWeightedRandom(POOL_HAND_LOCATION, chaosLevel, true, recentPicks);
             const flaw = pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks);
             selectedLocationDesc = `${location.name} ${location.desc}`;
             
             specificPrompt = `
             MODE: Product Realism Regeneration.
             
             >>> STRICT VISUAL LOCK (FROM SYSTEM) <<<
             YOU MUST USE THESE EXACT VISUALS FOR ALL SCENES (DO NOT INVENT NEW ONES):
             - Hand: ${hand.label}
             - Location & Environment: ${location.name} (${location.desc})
             - Lighting: ${location.lighting || 'Natural Ambient Light'}
             - Activity: ${activity.label}
             - Flaw: ${flaw.label}
             - Camera Angle: ${coreCameraAngle.label}
             - Video Artifact: ${videoArtifacts.label}
             - Camera: Choose a suitable camera motion for each scene.
             No Faces. No Full Body.

             >>> YOUR JOB (COPYWRITING, SCENE BREAKDOWN & STRATEGY) <<<
             - Tulis 'title': Judul konsep yang singkat, catchy, dan relevan (Bahasa Indonesia).
             - Tulis 'strategy': PENJELASAN SINGKAT per konsep (Bahasa Indonesia, 1-2 kalimat padat menjelaskan angle marketing).
             - Untuk setiap scene:
               * Tulis 'title': Judul scene singkat (Bahasa Indonesia).
               * Tulis 'description': PENJELASAN SINGKAT visual scene (Bahasa Indonesia, 1-2 kalimat ringkas apa yang terjadi di layar).
               * Tulis 'textOverlay': Teks hook ringkas di layar (Bahasa Indonesia).
               * Tulis 'narration': Naskah narasi/voiceover singkat & natural (Bahasa Indonesia).
               * Tulis 'voice_direction': Arahan intonasi dan gaya vokal membaca narasi.
               * Isi 'visual_logic' (in ENGLISH) dengan breakdown visual terkunci di atas.
               * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas:
                 - subject_movement: Fluid natural product interaction and motion in English.

             CRITICAL PRODUCT RULE:
             The user's PRODUCT is the absolute priority. Focus entirely on the texture, details, and material of the product. The product should be held, touched, or placed in the scene. DO NOT put the product on a human body. DO NOT describe a person wearing the product.

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             ${VIDEO_TRAINING_RULES}
             `;
        } else if (isFacelessBody) {
             const styleKey = mapModelToStyleKey(modelType);
             const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['FACELESS_BODY'];
             
             const selectedFraming = pickWeightedRandom(variations, chaosLevel, true, recentPicks);
             const selectedLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel, true, recentPicks);
             const selectedActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel, true, recentPicks);
             const selectedImperfection = pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks);
             selectedLocationDesc = `${selectedLocation.name} ${selectedLocation.desc}`;

             specificPrompt = `
             MODE: Faceless / Body Only Outfit Regeneration.
             BASE MODEL: ${modelType} (TARGET FRAMING: Neck-down, chin cropped out, or headless torso angle. Focus on outfit drape, silhouette, and fabric motion)
             
             >>> STRICT VISUAL LOCK (FROM SYSTEM) <<<
             YOU MUST USE THESE EXACT VISUALS FOR ALL SCENES (DO NOT INVENT NEW ONES):
             - Framing: ${selectedFraming.label}
             - Location & Environment: ${selectedLocation.name} (${selectedLocation.desc})
             - Lighting: ${selectedLocation.lighting || 'Natural Ambient Light'}
             - Activity: ${selectedActivity.label}
             - Imperfection: ${selectedImperfection.label}
             - Camera Angle: ${coreCameraAngle.label}
             - Video Artifact: ${videoArtifacts.label}
             - Camera: Choose a suitable camera motion for each scene.
             No Faces.
             
             >>> YOUR JOB (COPYWRITING, SCENE BREAKDOWN & STRATEGY) <<<
             - Tulis 'title': Judul konsep yang singkat, catchy, dan relevan (Bahasa Indonesia).
             - Tulis 'strategy': PENJELASAN SINGKAT per konsep (Bahasa Indonesia, 1-2 kalimat padat menjelaskan angle marketing).
             - Untuk setiap scene:
               * Tulis 'title': Judul scene singkat (Bahasa Indonesia).
               * Tulis 'description': PENJELASAN SINGKAT visual scene (Bahasa Indonesia, 1-2 kalimat ringkas apa yang terjadi di layar).
               * Tulis 'textOverlay': Teks hook ringkas di layar (Bahasa Indonesia).
               * Tulis 'narration': Naskah narasi/voiceover singkat & natural (Bahasa Indonesia).
               * Tulis 'voice_direction': Arahan intonasi dan gaya vokal membaca narasi.
               * Isi 'visual_logic' (in ENGLISH) dengan breakdown visual terkunci di atas.
               * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas:
                 - subject_movement: Fluid, natural human kinetic motion with realistic fabric drape in English (strictly matching active_reference angle).

             CRITICAL OUTFIT RULE:
             The user's PRODUCT is the absolute priority. If the product is a piece of clothing, the model MUST wear it as their primary outfit. If the 'New Random Variation' suggests a conflicting outfit, you MUST adapt it. Do NOT cover the product. Instead, turn the conflicting item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned).

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             ${VIDEO_TRAINING_RULES}
             `;
        } else {
             const styleKey = mapModelToStyleKey(modelType);
             const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['TIKTOK_GIRL'];

             const selectedStyle = pickWeightedRandom(variations, chaosLevel, true, recentPicks);
             const selectedLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel, true, recentPicks);
             const selectedActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel, true, recentPicks);
             const selectedImperfection = pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks);
             selectedLocationDesc = `${selectedLocation.name} ${selectedLocation.desc}`;

             specificPrompt = `
             MODE: Human Realism Regeneration.
             BASE MODEL: ${modelType}

             >>> STRICT VISUAL LOCK (FROM SYSTEM) <<<
             YOU MUST USE THESE EXACT VISUALS FOR ALL SCENES (DO NOT INVENT NEW ONES):
             - Look: ${selectedStyle.label}
             - Location & Environment: ${selectedLocation.name} (${selectedLocation.desc})
             - Lighting: ${selectedLocation.lighting || 'Natural Ambient Light'}
             - Activity: ${selectedActivity.label}
             - Imperfection: ${selectedImperfection.label}
             - Camera Angle: ${coreCameraAngle.label}
             - Video Artifact: ${videoArtifacts.label}
             - Camera: Choose a suitable camera motion for each scene.

             >>> YOUR JOB (COPYWRITING, SCENE BREAKDOWN & STRATEGY) <<<
             - Tulis 'title': Judul konsep yang singkat, catchy, dan relevan (Bahasa Indonesia).
             - Tulis 'strategy': PENJELASAN SINGKAT per konsep (Bahasa Indonesia, 1-2 kalimat padat menjelaskan angle marketing).
             - Untuk setiap scene:
               * Tulis 'title': Judul scene singkat (Bahasa Indonesia).
               * Tulis 'description': PENJELASAN SINGKAT visual scene (Bahasa Indonesia, 1-2 kalimat ringkas apa yang terjadi di layar).
               * Tulis 'textOverlay': Teks hook ringkas di layar (Bahasa Indonesia).
               * Tulis 'narration': Naskah narasi/voiceover singkat & natural (Bahasa Indonesia).
               * Tulis 'voice_direction': Arahan intonasi dan gaya vokal membaca narasi.
               * Isi 'visual_logic' (in ENGLISH) dengan breakdown visual terkunci di atas.
               * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas:
                 - subject_movement: Fluid, natural human kinetic motion with realistic fabric drape in English (strictly matching active_reference angle).

             CRITICAL OUTFIT RULE:
             The user's PRODUCT is the absolute priority. If the product is a piece of clothing, the model MUST wear it as their primary outfit. If the 'New Random Variation' suggests a conflicting outfit, you MUST adapt it. Do NOT cover the product. Instead, turn the conflicting item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned).

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             ${VIDEO_TRAINING_RULES}
             `;
        }
    } else {
        specificPrompt = "Create a viral UGC concept.";
    }

    const parts: any[] = [
      { inlineData: { mimeType: mimeType, data: base64Image } }
    ];

    let backImageContext = "";
    if (backImage) {
        parts.push({ inlineData: { mimeType: backImage.mimeType, data: backImage.base64 } });
        backImageContext = `
        - PENTING (DUAL IMAGE REFERENCE): Anda menerima 2 gambar referensi. Gambar pertama adalah tampak DEPAN ('front'), gambar kedua adalah tampak BELAKANG ('back').
        - Buatlah variasi scene yang menampilkan kedua sisi produk secara logis dan proporsional.
        - ATURAN MUTLAK PERSPECTIVE LOCK:
          * Isi kolom 'active_reference' dengan 'front' (jika scene menyorot sisi depan) ATAU 'back' (jika scene menyorot sisi belakang).
          * Setiap scene HANYA berfokus pada 1 sudut pandang sesuai active_reference. DILARANG memutar kamera 180°/360° atau menampilkan sisi yang tidak ada di foto referensi frame awal!
        `;
    }

    const requestContents = {
      parts: [
        ...parts,
        {
          text: `Create ONE unique UGC video concept. ${options.sceneCount} Scenes.
          ${backImageContext}
          ${specificPrompt}
          ${negativePrompt}
          Provide EXACTLY 5 relevant hashtags WITHOUT the '#' symbol (e.g. ["ootd", "outfitinspo", "tiktokfashion", "style", "racuntiktok"]).

          OUTPUT FORMAT (STRICT RAW JSON ONLY):
          {
            "title": "Judul Konsep Singkat & Menarik (Bahasa Indonesia)",
            "strategy": "Penjelasan singkat strategi & angle marketing (Bahasa Indonesia, 1-2 kalimat)",
            "viralCaption": "Caption media sosial yang engaging",
            "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
            "scenes": [
              {
                "title": "Judul Scene (Bahasa Indonesia)",
                "description": "Penjelasan singkat visual scene (Bahasa Indonesia, 1-2 kalimat)",
                "textOverlay": "Teks singkat di layar video",
                "narration": "Naskah narasi/voiceover singkat",
                "voice_direction": "Instruksi intonasi vokal",
                "active_reference": "front",
                "visual_logic": {
                  "subject_desc": "Detailed visual description of subject in English matching the locked look",
                  "action_pose": "Exact action in English",
                  "product_placement": "Product placement in English",
                  "lighting_atmosphere": "Lighting instruction in English",
                  "camera_angle": "Camera angle in English"
                },
                "video_logic": {
                  "subject_movement": "Fluid human kinetic movement in English with fabric drape and perspective lock",
                  "scene_atmosphere": "Scene atmosphere in English",
                  "micro_story": "Short emotional context in English",
                  "camera_motion": "Camera motion in English",
                  "product_placement": "Product stability description in English",
                  "engine_safety_rules": "Safety rules in English"
                }
              }
            ]
          }
          Output strict RAW JSON ONLY. Must start with '{' and end with '}'. No markdown or conversational text.`
        }
      ],
    };

    const response: GenerateContentResponse = await executeWithKeyPool(apiKey, async (ai, model) => {
      return await ai.models.generateContent({
        model: model,
        contents: requestContents,
        config: {
          responseMimeType: "application/json",
          responseSchema: singleConceptSchema,
        },
      });
    }, { baseUrl, preferredModel });

    const parsed = safeJsonParse(response.text || "{}");
    const concept = (parsed.concepts && Array.isArray(parsed.concepts) && parsed.concepts[0]) ? parsed.concepts[0] : parsed;
    return processConcept(concept, options, videoArtifacts.label, selectedLocationDesc, videoChaosLevel);

  } catch (error) {
    throw error;
  }
};

export const generateEditedImage = async (
    apiKey: string,
    base64Image: string,
    mimeType: string,
    prompt: string,
    references?: { talent?: UploadedImage; background?: UploadedImage },
    baseUrl?: string,
    preferredModel?: string
): Promise<string> => {
    try {
        const parts: any[] = [{ inlineData: { mimeType, data: base64Image } }];

        let systemContext = `ROLE: Photo Retoucher. Composite Product into scene.
        PROMPT: ${prompt}
        STYLE: ${HYPER_REALISM_BASE}`;

        if (references?.background) {
            parts.push({ inlineData: { mimeType: references.background.mimeType, data: references.background.base64 } });
            systemContext += `\nRef Background provided.`;
        }
        if (references?.talent) {
             parts.push({ inlineData: { mimeType: references.talent.mimeType, data: references.talent.base64 } });
             systemContext += `\nRef Talent provided.`;
        }
        parts.push({ text: systemContext });

        return await executeWithKeyPool(apiKey, async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts },
            });

            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part?.inlineData?.data) return part.inlineData.data;
            throw new Error("No image generated");
        }, { baseUrl, preferredModel, isImageGeneration: true });
    } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes('429')) {
            throw new Error("RATE_LIMIT");
        }
        throw error;
    }
};

export const generateSpeech = async (
    apiKey: string,
    text: string,
    config: any,
    baseUrl?: string,
    preferredModel?: string
): Promise<string> => {
    try {
        const isMulti = !!config.voiceName2;
        let speechConfig: any = { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName1 } } };

        if (isMulti) {
             speechConfig = {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Speaker A', voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName1 } } },
                        { speaker: 'Speaker B', voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName2 } } }
                    ]
                }
             };
        }

        let promptText = text;
        if (config.style === 'asmr') {
            promptText = `<speak><prosody volume="soft" pitch="low" rate="medium">${text.replace(/[<>&]/g, '')}</prosody></speak>`;
        } else if (config.style === 'hype') {
            promptText = `<speak><prosody volume="loud" pitch="high" rate="fast">${text.replace(/[<>&]/g, '')}</prosody></speak>`;
        }

        const base64PCM = await executeWithKeyPool(apiKey, async (ai, model) => {
            const response = await ai.models.generateContent({
                model: model,
                contents: [{ parts: [{ text: promptText }] }],
                config: { responseModalities: ["AUDIO"] as any, speechConfig },
            });

            const candidate = response.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY') {
                throw new Error("Audio diblokir oleh filter keamanan (Safety Filter). Coba ubah teks Anda.");
            } else if (candidate?.finishReason === 'OTHER') {
                throw new Error("Gagal memproses audio (Internal Model Error). Coba ubah atau perpendek teks Anda.");
            }

            const pcm = candidate?.content?.parts?.[0]?.inlineData?.data;
            if (!pcm) {
                console.error("No audio returned. Full response:", JSON.stringify(response, null, 2));
                throw new Error(`Tidak ada audio yang dihasilkan oleh model. (Finish Reason: ${candidate?.finishReason || 'Unknown'})`);
            }
            return pcm;
        }, { baseUrl, preferredModel, isAudioGeneration: true });

        const pcmBytes = base64ToUint8Array(base64PCM);
        const sampleRate = config.sampleRate || 24000;
        const wavBytes = addWavHeader(pcmBytes, sampleRate, 1);
        const base64Wav = uint8ArrayToBase64(wavBytes);

        return `data:audio/wav;base64,${base64Wav}`;
    } catch (e) { throw e; }
}