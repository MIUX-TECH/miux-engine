import React, { useState, useEffect } from 'react';
import ConceptCard from './components/ConceptCard';
import WelcomeModal from './components/WelcomeModal';
import ApiKeyModal from './components/ApiKeyModal';
import OutfitStudio from './components/OutfitStudio';
import HistoryGallery from './components/HistoryGallery'; 
import ToastContainer from './components/Toast'; 
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import StudioBackground from './components/layout/StudioBackground';
import { UploadedImage, AnalysisResponse, GenerationOptions, ToastMessage, ToastType, HistoryItem, NarrationStyle } from './types';
import { regenerateSingleConcept } from './services/geminiService';
import { saveHistoryItem } from './services/historyService'; 

// TYPE DEFINITION FOR NAVIGATION
type NavPage = 'create' | 'library';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<NavPage>('create');
  
  const [image, setImage] = useState<UploadedImage | null>(null); 
  const [backImage, setBackImage] = useState<UploadedImage | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0); 
  const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set());
  const [showWelcome, setShowWelcome] = useState(false); 
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [modelName, setModelName] = useState<string>('Google AI (Auto)');

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Generation Parameters Store (for regeneration consistency)
  const [lastModelType, setLastModelType] = useState<string | undefined>(undefined);
  const [currentSceneCount, setCurrentSceneCount] = useState<number>(5);
  const [currentChaosLevel, setCurrentChaosLevel] = useState<number>(3);
  const [currentNarrationStyle, setCurrentNarrationStyle] = useState<NarrationStyle>('monolog');

  // Shared Options (Minimal)
  const options: GenerationOptions = {
    textOverlayMode: 'none',
    narrationMode: 'none',
    narrationStyle: currentNarrationStyle,
    sceneCount: currentSceneCount, // Synced with state
  };

  // --- STUDIO MESSAGES ---
  const LOADING_MESSAGES = [
      "Initializing Entropy Engine...",
      "Injecting Visual DNA...",
      "Bypassing AI Smoothing...",
      "Synthesizing Raw Textures...",
      "Assembling Concepts..."
  ];

  useEffect(() => {
    let storedKey = localStorage.getItem('miux_api_key') || '';
    if (storedKey === 'sk-22e56605e5c01f28-ixaxdm-90bafc3a' || storedKey === 'sk-46ef15de80a3d5cc-57agvr-8387adb4') {
        storedKey = '';
        localStorage.removeItem('miux_api_key');
    }
    setApiKey(storedKey);

    // Clean up local proxy and reset to pure Google AI Studio direct
    let storedBaseUrl = localStorage.getItem('miux_base_url') || '';
    if (storedBaseUrl.includes('localhost:20128') || storedBaseUrl.includes('127.0.0.1:20128')) {
        storedBaseUrl = '';
        localStorage.setItem('miux_base_url', '');
    }

    let storedModel = localStorage.getItem('miux_model');
    if (!storedModel || storedModel === 'gemini-2.5-flash' || storedModel === 'gemini-1.5-flash' || storedModel === 'ag/gemini-3.7-flash-medium') {
        storedModel = 'auto';
        localStorage.setItem('miux_model', 'auto');
    }
    setModelName(storedModel === 'auto' ? 'Google AI (Auto)' : storedModel);

    const hasVisited = localStorage.getItem('miux_black_visited');
    if (!hasVisited) {
        setShowWelcome(true);
        localStorage.setItem('miux_black_visited', 'true');
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; 
    if (isLoading) {
        setLoadingPhase(0);
        interval = setInterval(() => {
            setLoadingPhase(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    return () => {
        if (image?.previewUrl && image.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(image.previewUrl);
        }
        if (backImage?.previewUrl && backImage.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(backImage.previewUrl);
        }
    };
  }, [image, backImage]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveApiKey = (key: string, baseUrl?: string, model?: string) => {
      const cleanBaseUrl = baseUrl || '';
      const cleanModel = model || 'auto';
      localStorage.setItem('miux_api_key', key);
      localStorage.setItem('miux_base_url', cleanBaseUrl);
      localStorage.setItem('miux_model', cleanModel);
      setModelName('Google AI (Auto)');
      setApiKey(key);
      setShowApiKeyModal(false);
      showToast("API Key Google AI Studio Berhasil Diaktifkan", 'success');
  };

  const clearApiKey = () => {
      localStorage.removeItem('miux_api_key');
      setApiKey('');
      setShowApiKeyModal(true);
      showToast("API Key Direset", 'info');
  };

  const autoSaveToHistory = async (img: UploadedImage, result: AnalysisResponse, modelType: string, sceneCount: number, chaosLevel: number, narrationStyle: NarrationStyle, secondaryImage?: UploadedImage | null) => {
      try {
          const newItem: HistoryItem = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              mode: 'outfit',
              image: img,
              backImage: secondaryImage || undefined,
              analysis: result,
              modelType: modelType,
              genParams: {
                  sceneCount,
                  chaosLevel,
                  narrationStyle
              }
          };
          await saveHistoryItem(newItem);
      } catch (e) {
          console.error("Auto-save failed", e);
      }
  };

  // HANDLER: Outfit Realism Mode (The Only Mode)
  const handleOutfitAnalysisCompleteWithModel = (result: AnalysisResponse, mainImage: UploadedImage, modelType: string, sceneCount: number, chaosLevel: number, narrationStyle: NarrationStyle, secondaryImage?: UploadedImage | null) => {
      setImage(mainImage);
      setBackImage(secondaryImage || null);
      setAnalysis(result);
      setLastModelType(modelType);
      setCurrentSceneCount(sceneCount);
      setCurrentChaosLevel(chaosLevel);
      setCurrentNarrationStyle(narrationStyle);
      showToast("Visual Studio Tercipta.", 'success');
      autoSaveToHistory(mainImage, result, modelType, sceneCount, chaosLevel, narrationStyle, secondaryImage);
  }

  // HANDLER: Load From History
  const handleLoadHistory = (item: HistoryItem) => {
      setImage(item.image);
      setBackImage(item.backImage || null);
      setAnalysis(item.analysis);
      setLastModelType(item.modelType);
      // Restore params if available, otherwise default
      if (item.genParams) {
          setCurrentSceneCount(item.genParams.sceneCount);
          setCurrentChaosLevel(item.genParams.chaosLevel);
          if (item.genParams.narrationStyle) setCurrentNarrationStyle(item.genParams.narrationStyle);
      } else {
          // Fallback based on result length
          setCurrentSceneCount(item.analysis.concepts[0]?.scenes.length || 5);
          setCurrentChaosLevel(3);
          setCurrentNarrationStyle('monolog');
      }
      setActivePage('create');
      showToast("Arsip Studio Dimuat.", 'success');
  };

  const handleRegenerateSingle = async (index: number) => {
    if (!image || !analysis) return;
    setRegeneratingIndices(prev => new Set(prev).add(index));
    
    try {
        // Use currentSceneCount and currentChaosLevel
        const newConcept = await regenerateSingleConcept(
            apiKey, 
            image.base64, 
            image.mimeType, 
            { ...options, sceneCount: currentSceneCount }, 
            lastModelType,
            currentChaosLevel,
            backImage
        );
        
        setAnalysis(prevAnalysis => {
            if (!prevAnalysis) return prevAnalysis;
            const updatedConcepts = [...prevAnalysis.concepts];
            updatedConcepts[index] = newConcept;
            const newAnalysis = { ...prevAnalysis, concepts: updatedConcepts };
            
            autoSaveToHistory(image, newAnalysis, lastModelType || 'Viral Cute Asian Girl (TikTok Celeb Aesthetic)', currentSceneCount, currentChaosLevel, currentNarrationStyle, backImage);
            return newAnalysis;
        });
        
        showToast(`Konsep ${index + 1} Diperbarui (Lv.${currentChaosLevel}).`, 'success');
        
    } catch (err: any) {
        console.error("Failed to regenerate single concept", err);
        showToast(`Gagal: ${err?.message || 'Terjadi kesalahan sistem.'}`, 'error');
    } finally {
        setRegeneratingIndices(prev => {
            const next = new Set(prev);
            next.delete(index);
            return next;
        });
    }
  };

  const backToStudio = () => {
    setAnalysis(null);
  };

  const handleClearImage = () => {
    if (image?.previewUrl && image.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(image.previewUrl);
    }
    if (backImage?.previewUrl && backImage.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(backImage.previewUrl);
    }
    setImage(null);
    setBackImage(null);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen relative text-zinc-300 font-sans overflow-hidden selection:bg-red-950 selection:text-red-300 flex flex-col bg-zinc-950">

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* STUDIO BACKGROUND */}
      <StudioBackground />

      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      <ApiKeyModal isOpen={showApiKeyModal} onSave={handleSaveApiKey} onClose={() => setShowApiKeyModal(false)} />

      {/* HEADER: STUDIO EDITION */}
      <Header onOpenSettings={() => setShowApiKeyModal(true)} onShowWelcome={() => setShowWelcome(true)} modelName={modelName} />

      <main className="max-w-xl mx-auto px-4 pt-28 pb-32 flex-grow w-full relative z-10">

        {activePage === 'create' && (
            <div className="animate-fade-in w-full">
                {!analysis ? (
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden relative">
                         {/* Top Accent Line */}
                         <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>

                         <OutfitStudio
                            apiKey={apiKey}
                            onAnalysisComplete={handleOutfitAnalysisCompleteWithModel}
                            isLoading={isLoading}
                            initialImage={image}
                            initialBackImage={backImage}
                            onClearImage={handleClearImage}
                            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
                         />
                    </div>
                ) : (
                    <div className="space-y-8">
                         {/* Result Header */}
                         <div className="flex items-center gap-4 sm:gap-6 p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl backdrop-blur-xl shadow-xl">
                            <div className="flex gap-2 shrink-0">
                                <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Depan" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-zinc-700/80 shadow-md" />
                                {backImage && (
                                    <img src={`data:${backImage.mimeType};base64,${backImage.base64}`} alt="Belakang" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-red-900/60 shadow-md" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 font-semibold">Produksi Siap</span>
                                </div>
                                <h3 className="text-white font-bold text-base sm:text-lg truncate mt-0.5">Subjek Teridentifikasi</h3>
                                <p className="text-[10px] sm:text-xs text-zinc-400 mt-1 uppercase tracking-widest font-mono">
                                    {isLoading ? LOADING_MESSAGES[loadingPhase] : `Analisa Selesai (${currentSceneCount} Scene)`}
                                </p>
                            </div>
                            {!isLoading && (
                                <button
                                    onClick={backToStudio}
                                    title="Kembali ke Studio Input"
                                    className="p-2.5 sm:p-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl transition-all shadow-sm shrink-0"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                    </svg>
                                </button>
                            )}
                         </div>

                         {/* Loading Bar */}
                         {isLoading && (
                             <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                 <div className="h-full bg-red-600 animate-progress shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                             </div>
                         )}

                         {/* Concepts */}
                         {analysis && (
                             <div className="space-y-6">
                                 {analysis.concepts.map((concept, idx) => (
                                    <ConceptCard
                                        key={idx}
                                        concept={concept}
                                        index={idx}
                                        defaultOpen={idx === 0}
                                        options={options}
                                        onRegenerate={() => handleRegenerateSingle(idx)}
                                        isRegenerating={regeneratingIndices.has(idx)}
                                        originalImage={image}
                                        backImage={backImage}
                                        apiKey={apiKey}
                                    />
                                ))}
                             </div>
                         )}
                    </div>
                )}
            </div>
        )}

        {activePage === 'library' && (
            <div className="animate-fade-in">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-600/30 bg-red-950/20 text-red-400 font-mono text-[10px] uppercase tracking-widest mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Arsip Produksi
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-wider uppercase">History Gallery</h2>
                </div>
                <HistoryGallery isActive={activePage === 'library'} onLoadItem={handleLoadHistory} />
            </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <BottomNav activePage={activePage} setActivePage={setActivePage as any} />

    </div>
  );
};

export default App;