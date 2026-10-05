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
no camera jump
no lighting shift
no flicker
no blur pumping
no artificial glow
no beauty filter
`;

const HYPER_REALISM_VIDEO_BASE = `
(RAW VIDEO, IPHONE 15 PRO MAX FOOTAGE).
viral tiktok style, amateur handheld realism, authentic look, unedited, natural film grain, no cinematic grading, no HDR look.
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
        subject_movement: { type: Type.STRING, description: "Micro-movements ONLY. e.g. 'Slowly adjusting glasses', 'Subtle breathing motion', 'Minimal movement'." },
        scene_atmosphere: { type: Type.STRING, description: "Lighting and mood details. e.g. 'Harsh overhead fluorescent, slight green tint'." },
        micro_story: { type: Type.STRING, description: "Short emotional context. e.g. 'Subject is feeling impatient, tapping fingers before taking a sip.'" },
        camera_motion: { type: Type.STRING, description: "Specific mathematical camera movement. e.g. 'Static handheld with subtle micro shake. SMOOTH DIGITAL ZOOM PUSH-IN: 3-5% over 4 seconds'." },
        product_placement: { type: Type.STRING, description: "How the product is shown and remains stable. e.g. 'Logo and Japanese text on chest clearly visible and sharp'." },
        engine_safety_rules: { type: Type.STRING, description: "Specific safety rules for this scene to prevent glitches. e.g. 'no zoom jump, no focus breathing glitch, no face distortion'." }
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

const assembleVideoPrompt = (logic: any, videoArtifacts: string, isCinematic: boolean, fallbackDesc?: string): string => {
    const l = logic || {};
    const subject = l.subject_desc || fallbackDesc || 'Authentic candid subject';
    const movement = l.subject_movement || 'Subtle natural micro-movements and breathing';
    const product = l.product_placement || 'Worn naturally and sharp';
    const scene = l.scene_atmosphere || 'Natural ambient lighting';
    const camera = l.camera_motion || 'Static handheld with subtle micro shake';
    const rules = l.engine_safety_rules || 'stable lighting across frames';

    return `${HYPER_REALISM_VIDEO_BASE}

SUBJECT:
${subject}

ACTION:
${movement}

PRODUCT:
${product}

LIGHTING & SCENE:
${scene}

CAMERA:
${camera}

VISUAL TEXTURE & CAMERA ARTIFACTS:
- Artifacts: ${videoArtifacts}
- Camera Dynamics: ${isCinematic ? "Smooth cinematic stabilization and subtle glide" : "Natural handheld micro-shake with authentic amateur POV feel"}

ENGINE SAFETY RULES:
- One main action per shot
- Movement must be minimal and slow
- Keep lighting consistent; no flicker
- ${rules}

NEGATIVE PROMPT:
${VIDEO_NEGATIVE_PROMPT}`.trim();
};

const processConcept = (concept: any, options: GenerationOptions, videoArtifacts?: string, locationDesc?: string, chaosLevel: number = 3): UGCConcept => {
  if (!concept || !Array.isArray(concept.scenes)) {
      return concept || { title: "", strategy: "", viralCaption: "", hashtags: [], scenes: [] };
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
    const compiledVideoPrompt = assembleVideoPrompt(videoLogic, artifacts, isCinematic, scene.description || scene.title);

    const newScene = { 
        ...scene,
        imageEditPrompt: compiledImagePrompt,
        videoGenPrompt: compiledVideoPrompt
    }; 
    delete newScene.visual_logic;
    delete newScene.video_logic;
    return newScene;
  });
  return { ...concept, scenes: processedScenes };
};

export interface AiSettings {
    baseUrl: string;
    model: string;
    apiKey: string;
}

export const getAiSettings = (): AiSettings => {
    const baseUrl = process.env.AI_BASE_URL || '';
    const apiKey = process.env.API_KEY || process.env.VITE_9ROUTER_API_KEY || '';
    let model = process.env.AI_MODEL || (baseUrl ? 'ag/gemini-3.7-flash-medium' : 'gemini-2.5-flash');

    // Auto-normalize ag/gemini-3.7-flash to ag/gemini-3.7-flash-medium
    if (model === 'ag/gemini-3.7-flash' || model === 'gemini-3.7-flash') {
        model = 'ag/gemini-3.7-flash-medium';
    }

    return { baseUrl, model, apiKey };
};

export const parseApiKeys = (input?: string): string[] => {
    if (!input) return [];
    const list = input
        .split(/[\n,;]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);
    return Array.from(new Set(list));
};

let globalKeyIndex = 0;

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
        throw new Error("API Key tidak ditemukan. Silakan masukkan API Key di Pengaturan.");
    }

    const effectiveBaseUrl = (options?.baseUrl !== undefined && options.baseUrl !== null && options.baseUrl.trim() !== '')
        ? options.baseUrl.trim()
        : settings.baseUrl;

    // Determine candidate models
    let candidateModels: string[] = [];
    if (options?.isImageGeneration) {
        candidateModels = ['imagen-3.0-generate-002', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    } else if (options?.isAudioGeneration) {
        candidateModels = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-3.8-flash-tts'];
    } else {
        const primary = options?.preferredModel || settings.model || (effectiveBaseUrl ? 'ag/gemini-3.7-flash-medium' : 'gemini-2.5-flash');
        if (effectiveBaseUrl) {
            candidateModels = [primary, 'ag/gemini-3.7-flash-medium', 'ag/gemini-3.8-flash-medium', 'ag/gemini-3.8-flash', 'ag/gemini-pro-agent'];
        } else {
            candidateModels = [primary, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'];
        }
    }
    candidateModels = Array.from(new Set(candidateModels.filter(Boolean)));

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
                attemptedErrors.push(`${logTag} -> ${status || 'ERR'}: ${msg.substring(0, 120)}`);
                console.warn(`${logTag} Error:`, status || '', msg.substring(0, 120));

                const isKeyAuthError = status === 401 ||
                                       msg.includes('API_KEY_INVALID') ||
                                       msg.includes('Invalid API key') ||
                                       msg.includes('invalid_api_key');

                const isKeyQuotaExhausted = status === 429 ||
                                            msg.includes('RESOURCE_EXHAUSTED') ||
                                            msg.includes('insufficient_quota');

                // If key is definitely invalid, or quota exhausted and there are alternative keys, skip to next key
                if (isKeyAuthError || (isKeyQuotaExhausted && prioritizedKeys.length > 1)) {
                    break;
                }
            }
        }
    }

    const detailedErr = attemptedErrors.join('\n');
    console.error("[KeyPool Exhausted] Semua kombinasi API Key & Model gagal:\n" + detailedErr);
    throw new Error(`Semua API Key & Model di Key Pool gagal.\n${detailedErr}`);
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
        let overlayChaos = "";
        let consistencyGuide = "";
        let negativePrompt = RAW_NEGATIVE_PROMPT;
        let selectedLocationDesc = "";
        
        // Video specific chaos (capped at level 3 for safety)
        const videoChaosLevel = Math.min(chaosLevel, 3);
        const videoArtifacts = pickWeightedRandom(POOL_VIDEO_ARTIFACTS, videoChaosLevel);
        const coreCameraAngle = pickWeightedRandom(POOL_CAMERA_ANGLE, chaosLevel, true, recentPicks);

        if (isProductOnly) {
            // === MODE A: PRODUCT/HANDS ONLY (NO HUMAN BODY) ===
            const coreHand = pickWeightedRandom(getHandPoolForModel(modelType || ""), chaosLevel, true, recentPicks);
            const coreActivity = pickWeightedRandom(POOL_HAND_ACTIVITY, chaosLevel, true, recentPicks);
            const coreLocation = pickWeightedRandom(POOL_HAND_LOCATION, chaosLevel, true, recentPicks);
            selectedLocationDesc = `${coreLocation.name} ${coreLocation.desc}`;
            
            // Overlay Logic based on Chaos Level
            let overlayImperfections: string[] = [];

            // Chaos Slider Logic for Imperfections
            if (chaosLevel >= 3) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks).label);
            if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks).label);
            if (chaosLevel === 5) {
                overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel, true, recentPicks).label);
                coreStyle += " EXTREME TEXTURE. NO AI SMOOTHING.";
            }

            coreStyle = `FOCUS: PRODUCT DETAILS & HANDS ONLY. NO FACES. NO FULL BODY.`;
            overlayChaos = `
            >>> HANDS CORE STRUCTURE <<<
            - Hand Detail: ${coreHand.label}
            - Location & Environment: ${coreLocation.name} (${coreLocation.desc})
            - Lighting: ${coreLocation.lighting || 'Natural Ambient Light'}
            - Activity: ${coreActivity.label}
            - Camera Angle: ${coreCameraAngle.label}
            
            >>> CHAOS OVERLAY (Intensity ${chaosLevel}) <<<
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "None (Clean)"}
            
            >>> VIDEO MOTION (Intensity ${chaosLevel}) <<<
            - Artifacts: ${videoArtifacts.label}
            - Camera: Gemini MUST choose a suitable camera motion for EACH scene.
            `;
            
            consistencyGuide = `Hand details (${coreHand.label}) in ${coreLocation.name}`;
            negativePrompt += ` face, head, eyes, mouth, human body, full body, cinematic, studio lighting, perfect composition.`;

        } else if (isFacelessBody) {
            // === MODE B-1: FACELESS / BODY ONLY (MODEL WEARS PRODUCT, HEADLESS CROPPING) ===
            const styleKey = mapModelToStyleKey(modelType);
            const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['FACELESS_BODY'];
            const coreFraming = pickWeightedRandom(variations, chaosLevel, true, recentPicks);
            const coreLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel, true, recentPicks);
            const coreActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel, true, recentPicks);
            selectedLocationDesc = `${coreLocation.name} ${coreLocation.desc}`;

            let overlayImperfections: string[] = [];
            if (chaosLevel >= 2) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
            if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
            if (chaosLevel === 5) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);

            coreStyle = `TARGET FRAMING: FACELESS / BODY ONLY. The model MUST WEAR the product. Keep camera framed neck-down, chin cropped out, or headless torso angle. Focus on outfit drape, silhouette, and fabric motion.`;
            
            overlayChaos = `
            >>> BODY & FRAMING STRUCTURE <<<
            1. FRAMING & SILHOUETTE: ${coreFraming.label}
            2. LOCATION & ENVIRONMENT: ${coreLocation.name} (${coreLocation.desc})
            3. LIGHTING: ${coreLocation.lighting || 'Natural Ambient Light'}
            4. ACTIVITY: ${coreActivity.label}
            5. VIBE: ${coreLocation.vibe}
            6. CAMERA ANGLE: ${coreCameraAngle.label}

            >>> CHAOS OVERLAY (Intensity ${chaosLevel}) <<<
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "Clean (Level 1)"}
            
            >>> VIDEO MOTION (Intensity ${chaosLevel}) <<<
            - Artifacts: ${videoArtifacts.label}
            - Camera: Gemini MUST choose a suitable camera motion for EACH scene.
            `;

            consistencyGuide = coreFraming.label;
            negativePrompt += ` face, head, eyes, mouth, smiling face, portrait, headshot.`;

        } else {
            // === MODE B-2: HUMAN MODEL (FULL BODY / TALENT WITH FACE) ===
            const styleKey = mapModelToStyleKey(modelType);
            const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['TIKTOK_GIRL'];
            
            // Core Selection
            const coreLook = pickWeightedRandom(variations, chaosLevel, true, recentPicks);
            const coreLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel, true, recentPicks);
            const coreActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel, true, recentPicks);
            selectedLocationDesc = `${coreLocation.name} ${coreLocation.desc}`;

            // Overlay Logic
            let overlayImperfections: string[] = [];
            if (chaosLevel >= 2) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
            if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);
            if (chaosLevel === 5) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel, true, recentPicks).label);

            coreStyle = `TARGET MODEL BASE: "${modelType}"`;
            
            overlayChaos = `
            >>> HUMAN CORE STRUCTURE <<<
            1. LOOK: ${coreLook.label}
            2. LOCATION & ENVIRONMENT: ${coreLocation.name} (${coreLocation.desc})
            3. LIGHTING: ${coreLocation.lighting || 'Natural Ambient Light'}
            4. ACTIVITY: ${coreActivity.label}
            5. VIBE: ${coreLocation.vibe}
            6. CAMERA ANGLE: ${coreCameraAngle.label}

            >>> CHAOS OVERLAY (Intensity ${chaosLevel}) <<<
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "Clean (Level 1)"}
            
            >>> VIDEO MOTION (Intensity ${chaosLevel}) <<<
            - Artifacts: ${videoArtifacts.label}
            - Camera: Gemini MUST choose a suitable camera motion for EACH scene.
            `;

            consistencyGuide = coreLook.label;
        }

        const VIDEO_TRAINING_RULES = `
        >>> VIDEO GENERATION TRAINING RULES <<<
        - One main action per shot (do NOT stack many actions).
        - Movement must be minimal and slow (e.g., subtle breathing, slow blinking).
        - Keep camera movement simple: either (A) static + zoom OR (B) tracking only OR (C) tracking + tiny zoom.
        - Avoid pan/tilt while zooming.
        - Keep zoom low: Smooth zoom (3-5% over 4s), Snap zoom (max 8% in 0.3s), Breath zoom (1-2% in/out).
        - Narrow depth of field allowed, but no focus hunting.
        - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
        `;

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
            - PENTING: Anda menerima 2 gambar referensi. Gambar pertama adalah tampak DEPAN, gambar kedua adalah tampak BELAKANG.
            - Buatlah scene yang memamerkan kedua sisi produk secara logis.
            - Gunakan kolom 'active_reference' untuk menentukan sisi mana yang sedang difokuskan di setiap scene ('front' atau 'back').
            `;
        }

        const promptText = `
        ROLE: Viral TikTok Visual Director (Specialist in 'Ugly-Chic' & Flash Photography).
        TASK: Create 3 Video Concepts based on the uploaded image(s).
        ${backImageContext}
        
        >>> STRICT VISUAL LOCK (FROM SYSTEM) <<<
        YOU MUST USE THESE EXACT VISUALS FOR ALL SCENES (DO NOT INVENT NEW ONES):
        ${coreStyle}
        ${overlayChaos}
        
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
          * Isi 'visual_logic' (in ENGLISH) dengan breakdown visual terkunci di atas:
            - subject_desc: Full visual subject description in English matching the locked look.
            - action_pose: Exact action in English.
            - product_placement: Where and how the product is shown in English.
            - lighting_atmosphere: Specific lighting and atmosphere in English.
            - camera_angle: Specific camera angle in English.
          * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas:
            - subject_movement: Micro-movements in English.
            - scene_atmosphere: Lighting and mood in English.
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
        1. **Scene Count**: Exactly ${sceneCount} scenes per concept.
        2. **Language Rules**:
           - Judul konsep, strategi (penjelasan singkat konsep 1-2 kalimat), deskripsi scene (penjelasan singkat visual scene 1-2 kalimat), textOverlay, narasi: **BAHASA INDONESIA**.
           - visual_logic dan video_logic: **ENGLISH**.
        3. **Visual Consistency**: ALWAYS USE THE LOCKED VISUALS ABOVE. DO NOT change location, lighting, or model style.
        4. **Realism**: Prompt must mention 'iPhone 15 Pro Max', 'Noise', 'Unedited'.
        5. **Hashtags**: Provide EXACTLY 5 relevant hashtags per concept.
        
        OUTPUT FORMAT (STRICT RAW JSON ONLY):
        {
          "concepts": [
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
                    "subject_movement": "Micro-movements in English",
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

        // Pass selectedLocationDesc to processConcept for dynamic camera resolution if Gemini fails
        data.concepts = data.concepts.map(c => processConcept(c, options, videoArtifacts.label, selectedLocationDesc, videoChaosLevel));

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
               * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas.
             
             CRITICAL PRODUCT RULE:
             The user's PRODUCT is the absolute priority. Focus entirely on the texture, details, and material of the product. The product should be held, touched, or placed in the scene. DO NOT put the product on a human body. DO NOT describe a person wearing the product.

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             >>> VIDEO GENERATION TRAINING RULES <<<
             - One main action per shot.
             - Movement must be minimal and slow.
             - Keep camera movement simple (static+zoom, tracking only).
             - Keep zoom low (3-5% smooth, max 8% snap).
             - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
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
               * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas.

             CRITICAL OUTFIT RULE:
             The user's PRODUCT is the absolute priority. If the product is a piece of clothing, the model MUST wear it as their primary outfit. If the 'New Random Variation' suggests a conflicting outfit, you MUST adapt it. Do NOT cover the product. Instead, turn the conflicting item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned).

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             >>> VIDEO GENERATION TRAINING RULES <<<
             - One main action per shot.
             - Movement must be minimal and slow.
             - Keep camera movement simple (static+zoom, tracking only).
             - Keep zoom low (3-5% smooth, max 8% snap).
             - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
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
               * Isi 'video_logic' (in ENGLISH) dengan breakdown motion terkunci di atas.

             CRITICAL OUTFIT RULE:
             The user's PRODUCT is the absolute priority. If the product is a piece of clothing, the model MUST wear it as their primary outfit. If the 'New Random Variation' suggests a conflicting outfit, you MUST adapt it. Do NOT cover the product. Instead, turn the conflicting item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned).

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             >>> VIDEO GENERATION TRAINING RULES <<<
             - One main action per shot.
             - Movement must be minimal and slow.
             - Keep camera movement simple (static+zoom, tracking only).
             - Keep zoom low (3-5% smooth, max 8% snap).
             - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
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
        - PENTING: Anda menerima 2 gambar referensi. Gambar pertama adalah tampak DEPAN, gambar kedua adalah tampak BELAKANG.
        - Buatlah scene yang memamerkan kedua sisi produk secara logis.
        - Gunakan kolom 'active_reference' untuk menentukan sisi mana yang sedang difokuskan di setiap scene ('front' atau 'back').
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
          Provide EXACTLY 5 relevant hashtags.

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
                  "subject_movement": "Micro-movements in English",
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