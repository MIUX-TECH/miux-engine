import React, { useState } from 'react';
import FileUpload from './FileUpload';
import { UploadedImage, AnalysisResponse, NarrationStyle } from '../types';
import { generateOutfitConcepts } from '../services/geminiService';
import ArchetypeSelectorModal, { ARCHETYPES } from './ArchetypeSelectorModal';

interface OutfitStudioProps {
  onAnalysisComplete: (
    analysis: AnalysisResponse,
    image: UploadedImage,
    modelType: string,
    sceneCount: number,
    chaosLevel: number,
    narrationStyle: NarrationStyle,
    backImage?: UploadedImage | null
  ) => void;
  isLoading: boolean;
  apiKey: string;
  initialImage?: UploadedImage | null;
  initialBackImage?: UploadedImage | null;
  onClearImage?: () => void;
  onOpenApiKeyModal?: () => void;
}

interface ChaosPreset {
  level: number;
  label: string;
  sublabel: string;
  lighting: string;
  grain: string;
  shutter: string;
  colorClass: string;
}

const CHAOS_PRESETS: Record<number, ChaosPreset> = {
  1: {
    level: 1,
    label: 'Clean',
    sublabel: 'Studio Pristine',
    lighting: 'Simetris & Soft Studio Light',
    grain: '0% (Tanpa Noise / AI Pristine)',
    shutter: 'Tripod Locked 1/250s',
    colorClass: 'border-zinc-700 bg-zinc-900 text-zinc-300'
  },
  2: {
    level: 2,
    label: 'Light',
    sublabel: 'Commercial Editorial',
    lighting: 'Daylight Lembut & Bayangan Halus',
    grain: 'Micro-Grain Kulit Alami',
    shutter: 'Daylight 1/160s',
    colorClass: 'border-sky-800/70 bg-sky-950/30 text-sky-400'
  },
  3: {
    level: 3,
    label: 'Real',
    sublabel: 'Street Candid (Rekomendasi)',
    lighting: 'Ambient Daylight & Imperfeksi Nyata',
    grain: 'Tekstur Kamera Smartphone Alami',
    shutter: 'Handheld Walking 1/120s',
    colorClass: 'border-emerald-700/70 bg-emerald-950/30 text-emerald-400'
  },
  4: {
    level: 4,
    label: 'Raw',
    sublabel: 'Direct Flash & Motion',
    lighting: 'Direct Hard Point-and-Shoot Flash',
    grain: 'ISO 800 Natural Color Grain',
    shutter: 'Candid Motion Trace Terarah',
    colorClass: 'border-amber-600/70 bg-amber-950/30 text-amber-400'
  },
  5: {
    level: 5,
    label: 'Chaos',
    sublabel: 'Underground Lo-Fi',
    lighting: 'Night Club Glare & Harsh Flare',
    grain: 'Heavy ISO 3200 Raw Street Texture',
    shutter: 'Artifacts & Natural Rolling Flare',
    colorClass: 'border-red-600/80 bg-red-950/40 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
  }
};

const OutfitStudio: React.FC<OutfitStudioProps> = ({
  onAnalysisComplete,
  isLoading,
  apiKey,
  initialImage,
  initialBackImage,
  onClearImage,
  onOpenApiKeyModal
}) => {
  const [productImg, setProductImg] = useState<UploadedImage | null>(initialImage || null);
  const [productImgBack, setProductImgBack] = useState<UploadedImage | null>(initialBackImage || null);
  const [modelType, setModelType] = useState<string>('Viral Cute Asian Girl (TikTok Celeb Aesthetic)');
  const [localLoading, setLocalLoading] = useState(false);
  const [sceneCount, setSceneCount] = useState<number>(5);
  const [chaosLevel, setChaosLevel] = useState<number>(3);
  const [narrationStyle, setNarrationStyle] = useState<NarrationStyle>('monolog');
  const [showArchetypeModal, setShowArchetypeModal] = useState(false);

  React.useEffect(() => {
    setProductImg(initialImage || null);
    setProductImgBack(initialBackImage || null);
  }, [initialImage, initialBackImage]);

  const handleUploadFront = async (img: UploadedImage) => {
    setProductImg(img);
  };

  const handleUploadBack = async (img: UploadedImage) => {
    setProductImgBack(img);
  };

  const handleGenerate = async () => {
    if (!productImg) return;
    if (!apiKey || apiKey.trim() === '') {
      if (onOpenApiKeyModal) {
        onOpenApiKeyModal();
      } else {
        alert('Silakan masukkan API Key Google AI Studio Anda terlebih dahulu.');
      }
      return;
    }

    setLocalLoading(true);
    try {
      const result = await generateOutfitConcepts(
        apiKey,
        productImg.base64,
        productImg.mimeType,
        modelType,
        sceneCount,
        chaosLevel,
        narrationStyle,
        productImgBack
      );
      onAnalysisComplete(result, productImg, modelType, sceneCount, chaosLevel, narrationStyle, productImgBack);
    } catch (e: any) {
      console.error(e);
      alert(`Gagal: ${e?.message || 'Terjadi kesalahan sistem.'}`);
    } finally {
      setLocalLoading(false);
    }
  };

  const isProcessing = isLoading || localLoading;
  const currentChaos = CHAOS_PRESETS[chaosLevel] || CHAOS_PRESETS[3];
  const selectedArchetype = ARCHETYPES.find(a => a.value === modelType) || {
    id: 'custom',
    value: modelType,
    label: modelType,
    category: 'viral' as const,
    categoryLabel: 'Kustom',
    description: 'Archetype terpilih untuk produksi visual.',
    tags: ['CustomModel'],
    visualAura: 'Studio Standard Lighting'
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 sm:p-7 bg-zinc-950/90 text-zinc-200">
      <div className="max-w-xl w-full space-y-7">

        {/* STUDIO HEADER */}
        <div className="space-y-2 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-600/30 bg-red-950/20 text-red-400 font-mono text-[10px] tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            ENTROPY ENGINE v5.0 ONLINE
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            OUTFIT REALISM STUDIO
          </h2>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
            Sintesis Visual Tanpa Filter & Brief Produksi UGC
          </p>
        </div>

        {/* MAIN STUDIO CONTAINER */}
        <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 relative backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center gap-6">

            {/* DUAL IMAGE UPLOAD WORKSPACE */}
            <div className="w-full">
              <div className="flex items-center justify-between px-1 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1 h-3 bg-red-600 rounded-sm" />
                  Area Input Produk
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Format 3:4 Direkomendasikan
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">

                {/* 1. FRONT IMAGE */}
                <div className="flex flex-col gap-1.5">
                  {!productImg ? (
                    <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-dashed border-red-600/40 hover:border-red-500 flex flex-col items-center justify-center bg-zinc-950/60 hover:bg-zinc-900/40 transition-all duration-300 group">
                      <div className="scale-75 origin-center w-full">
                        <FileUpload
                          variant="compact"
                          onImageSelected={handleUploadFront}
                          isLoading={isProcessing}
                        />
                      </div>
                      <div className="absolute bottom-3 text-center px-2 pointer-events-none">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-red-400 uppercase block">
                          Tampak Depan
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          (Wajib / Referensi Utama)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-lg group">
                      <img
                        src={productImg.previewUrl}
                        alt="Tampak Depan"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-red-400 tracking-wider">
                          DEPAN (UTAMA)
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400">
                          Siap Proses
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setProductImg(null);
                          setProductImgBack(null);
                          if (onClearImage) onClearImage();
                        }}
                        disabled={isProcessing}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/80 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700/60 flex items-center justify-center transition-all duration-200 text-xs font-mono"
                        title="Hapus foto depan"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. BACK IMAGE */}
                <div className="flex flex-col gap-1.5">
                  {!productImgBack ? (
                    <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-dashed border-zinc-800 hover:border-zinc-700 flex flex-col items-center justify-center bg-zinc-950/60 hover:bg-zinc-900/40 transition-all duration-300 group">
                      <div className="scale-75 origin-center w-full">
                        <FileUpload
                          variant="compact"
                          onImageSelected={handleUploadBack}
                          isLoading={isProcessing}
                        />
                      </div>
                      <div className="absolute bottom-3 text-center px-2 pointer-events-none">
                        <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase block">
                          Tampak Belakang
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          (Opsional / Angle 2)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-lg group">
                      <img
                        src={productImgBack.previewUrl}
                        alt="Tampak Belakang"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-zinc-300 tracking-wider">
                          BELAKANG (ANGLE 2)
                        </span>
                        <span className="text-[9px] font-mono text-zinc-400">
                          Aktif
                        </span>
                      </div>
                      <button
                        onClick={() => setProductImgBack(null)}
                        disabled={isProcessing}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/80 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700/60 flex items-center justify-center transition-all duration-200 text-xs font-mono"
                        title="Hapus foto belakang"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* CONTROLS (Active only after primary image is uploaded) */}
            {productImg && (
              <div className="space-y-6 w-full text-left border-t border-zinc-800/80 pt-6 animate-fade-in">

                {/* 1. MODEL ARCHETYPE SELECTOR CARD */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Subjek Target & Archetype
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowArchetypeModal(true)}
                      disabled={isProcessing}
                      className="text-[10px] font-mono text-red-400 hover:text-red-300 underline tracking-wider"
                    >
                      Buka Katalog ({ARCHETYPES.length}) ↗
                    </button>
                  </div>

                  <div
                    onClick={() => !isProcessing && setShowArchetypeModal(true)}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {selectedArchetype.categoryLabel}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 truncate">
                          #{selectedArchetype.tags[0] || 'Aesthetic'}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">
                        {selectedArchetype.label}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {selectedArchetype.description}
                      </p>
                    </div>

                    <div className="shrink-0 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-300 group-hover:border-red-600/60 group-hover:text-white transition-all">
                      Ganti →
                    </div>
                  </div>
                </div>

                {/* 2. CHAOS LEVEL REALISM MATRIX HUD */}
                <div className="space-y-2.5 p-4 rounded-xl border border-zinc-800/90 bg-zinc-950/70">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Intensitas Realisme Visual
                      </label>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Level {chaosLevel}: <span className="font-bold text-white">{currentChaos.label}</span> — {currentChaos.sublabel}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${currentChaos.colorClass}`}>
                      Lv.{chaosLevel}
                    </span>
                  </div>

                  {/* Slider Control */}
                  <div className="relative pt-2 pb-1">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={chaosLevel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChaosLevel(parseInt(e.target.value))}
                      disabled={isProcessing}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600 hover:accent-red-500 transition-all"
                    />
                    {/* Range Labels */}
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-2 px-1">
                      <span>Lv.1 Clean</span>
                      <span>Lv.2 Light</span>
                      <span>Lv.3 Real (Standar)</span>
                      <span>Lv.4 Raw</span>
                      <span>Lv.5 Chaos</span>
                    </div>
                  </div>

                  {/* Telemetry Indicator HUD */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[10px] font-mono">
                    <div className="p-2 rounded bg-black/60 border border-zinc-800/60">
                      <span className="text-[8px] text-zinc-500 uppercase block">Lighting</span>
                      <span className="text-zinc-300 truncate block">{currentChaos.lighting}</span>
                    </div>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800/60">
                      <span className="text-[8px] text-zinc-500 uppercase block">Grain / Noise</span>
                      <span className="text-zinc-300 truncate block">{currentChaos.grain}</span>
                    </div>
                    <div className="p-2 rounded bg-black/60 border border-zinc-800/60">
                      <span className="text-[8px] text-zinc-500 uppercase block">Shutter / Kamera</span>
                      <span className="text-zinc-300 truncate block">{currentChaos.shutter}</span>
                    </div>
                  </div>
                </div>

                {/* 3. SCENE COUNT & NARRATION STYLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Scene Count */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">
                        Durasi Konsep
                      </label>
                      <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        {sceneCount} Scene
                      </span>
                    </div>

                    <input
                      type="range"
                      min="3"
                      max="10"
                      step="1"
                      value={sceneCount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSceneCount(parseInt(e.target.value))}
                      disabled={isProcessing}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />

                    {/* Quick scene chips */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {[3, 5, 8, 10].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setSceneCount(cnt)}
                          disabled={isProcessing}
                          className={`flex-1 py-1 rounded text-[10px] font-mono transition-all border ${
                            sceneCount === cnt
                              ? 'bg-red-600/20 border-red-600 text-white font-bold'
                              : 'bg-black/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {cnt}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Narration Style */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60">
                    <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
                      Gaya Narasi Dubbing
                    </label>

                    <select
                      value={narrationStyle}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNarrationStyle(e.target.value as NarrationStyle)}
                      disabled={isProcessing}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-600 font-mono transition-colors"
                    >
                      <option value="monolog">Monolog (Natural & Informatif)</option>
                      <option value="jaksel">Anak Jaksel (Campur Inggris)</option>
                      <option value="reviewer">Reviewer Jujur (Kritis & Realistis)</option>
                      <option value="asmr">Soft Girl ASMR (Berbisik & Estetik)</option>
                      <option value="hype">Hypebeast Bro (Cepat & Energetik)</option>
                      <option value="sales">Sales SPG (Hard Selling & Ramah)</option>
                      <option value="storytime">Storytime (Curhat Mengalir)</option>
                    </select>

                    <p className="text-[10px] font-mono text-zinc-500 pt-1">
                      Mempengaruhi intonasi & pemilihan kosa kata naskah audio.
                    </p>
                  </div>

                </div>

                {/* API KEY WARNING IF MISSING */}
                {(!apiKey || apiKey.trim() === '') && (
                  <div
                    onClick={onOpenApiKeyModal}
                    className="cursor-pointer p-3.5 bg-red-950/20 border border-red-600/40 rounded-xl flex items-center justify-between hover:bg-red-950/40 transition-all text-xs font-mono text-red-400"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>API Key Google AI Studio belum aktif</span>
                    </span>
                    <span className="underline font-bold text-white">Konfigurasi Key ↗</span>
                  </div>
                )}

                {/* GENERATE CTA BUTTON */}
                <button
                  onClick={handleGenerate}
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-xl font-mono font-bold text-xs sm:text-sm tracking-[0.2em] uppercase transition-all duration-300 relative overflow-hidden border ${
                    isProcessing
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.35)] active:scale-[0.99]'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>MEMPROSES SINTESIS VISUAL...</span>
                    </span>
                  ) : (
                    <span>⚡ BANGKITKAN PRODUKSI VISUAL</span>
                  )}
                </button>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ARCHETYPE SELECTOR MODAL */}
      <ArchetypeSelectorModal
        isOpen={showArchetypeModal}
        onClose={() => setShowArchetypeModal(false)}
        selectedModel={modelType}
        onSelect={(val: string) => setModelType(val)}
      />

    </div>
  );
};

export default OutfitStudio;
