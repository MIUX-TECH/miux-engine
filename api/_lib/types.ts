export interface Scene {
  title: string;
  description: string;
  textOverlay: string;
  narration: string;
  voice_direction?: string;
  active_reference?: 'front' | 'back';
  imageEditPrompt: string;
  videoGenPrompt: string;
}

export interface UGCConcept {
  title: string;
  strategy: string;
  viralCaption: string;
  hashtags: string[];
  scenes: Scene[];
}

export interface AnalysisResponse {
  concepts: UGCConcept[];
}

export interface UploadedImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export type GenerationMode = 'none' | 'manual' | 'merged';
export type NarrationStyle = string;

export interface GenerationOptions {
  textOverlayMode: GenerationMode;
  narrationMode: GenerationMode;
  narrationStyle: NarrationStyle;
  sceneCount: number;
}

export interface ProductStrategy {
  name: string;
  category: string;
  marketLevel: string;
  usp: string;
  offer: string;
  targetPersona: string;
  brandVoice: string;
  marketingAngle: string;
  painPoint: string;
  isWearable: boolean;
  isConsumable: boolean;
}

export interface VisualSuggestions {
  setting: string;
  lighting: string;
  mood: string;
  cameraAngle: string;
}

export interface ProductData {
  name: string;
  category: string;
  usp: string;
  targetAudience: string;
  promo?: string;
  isWearable: boolean;
  visualSuggestions: VisualSuggestions;
}

export interface TalentConfig {
  enabled: boolean;
  mode: 'builder' | 'custom' | 'upload';
  image?: UploadedImage | null;
  customPrompt?: string;
  details: {
    gender: string;
    ageGroup: string;
    ethnicity: string;
    lookVibe: string;
    bodyType: string;
    skinTone: string;
    hairStyle: string;
    makeupLook: string;
    clothingStyle: string;
    clothingColor: string;
    hijab: string;
  };
}

export interface CinematographyConfig {
  mode: 'builder' | 'upload';
  image?: UploadedImage | null;
  settingType: string;
  locationDetail: string;
  lighting: string;
  cameraAngle: string;
  depthOfField: string;
  cameraMovement: string;
  colorGrade: string;
  filmGrain: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  productName: string;
  category: string;
  image: UploadedImage;
  backImage?: UploadedImage | null;
  concepts: UGCConcept[];
  talentConfig?: TalentConfig;
  cinematographyConfig?: CinematographyConfig;
}
