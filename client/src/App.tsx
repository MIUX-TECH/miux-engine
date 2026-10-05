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
  const [modelName, setModelName] = useState<string>('ag/gemini-3.7-flash-medium');

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
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const defaultBaseUrl = isLocal ? `http://${window.location.hostname}:20128` : '';

    let storedKey = localStorage.getItem('miux_api_key') || '';
    if (storedKey === 'sk-22e56605e5c01f28-ixaxdm-90bafc3a' || storedKey === 'sk-46ef15de80a3d5cc-57agvr-8387adb4') {
        if (!isLocal) {
            storedKey = '';
            localStorage.removeItem('miux_api_key');
        }
    }
    setApiKey(storedKey);

    const storedBaseUrl = localStorage.getItem('miux_base_url') ?? defaultBaseUrl;
    localStorage.setItem('miux_base_url', storedBaseUrl);

    let storedModel = localStorage.getItem('miux_model');
    if (!storedModel || storedModel === 'gemini-2.5-flash' || storedModel === 'gemini-1.5-flash') {
        storedModel = storedBaseUrl ? 'ag/gemini-3.7-flash-medium' : 'gemini-3.8-flash';
    }
    localStorage.setItem('miux_model', storedModel);
    setModelName(storedModel);

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
      localStorage.setItem('miux_api_key', key);
      if (baseUrl !== undefined) localStorage.setItem('miux_base_url', baseUrl);
      if (model !== undefined) {
          localStorage.setItem('miux_model', model);
          setModelName(model);
      }
      setApiKey(key);
      setShowApiKeyModal(false);
      showToast("Konfigurasi AI Berhasil Disimpan", 'success');
  };

  const clearApiKey = () => {
      localStorage.removeItem('miux_api_key');
      setApiKey('');
      setShowApiKeyModal(true);
      showToast("Konfigurasi AI Direset", 'info');
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
    <div className="min-h-screen relative text-zinc-300 font-sans overflow-hidden selection:bg-neon/30 selection:text-white flex flex-col bg-dark">
      
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
                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative">
                         {/* Neon Line Top */}
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon/20 via-neon to-neon/20"></div>
                         
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
                         <div className="flex items-center gap-6 p-4 bg-zinc-900/30 border border-neon/20 rounded-2xl backdrop-blur-md">
                            {/* REMOVED GRAYSCALE HERE */}
                            <div className="flex gap-2">
                                <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-700 transition-all duration-500" />
                                {backImage && (
                                    <img src={`data:${backImage.mimeType};base64,${backImage.base64}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-700 transition-all duration-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold font-display text-lg">Subjek Terdeteksi</h3>
                                <p className="text-xs text-neon/80 mt-1 uppercase tracking-widest font-mono animate-pulse">
                                    {isLoading ? LOADING_MESSAGES[loadingPhase] : `Analisa Selesai (${currentSceneCount} Scene)`}
                                </p>
                            </div>
                            {!isLoading && (
                                <button onClick={backToStudio} className="p-3 bg-neon/10 hover:bg-neon/30 text-neon hover:text-white rounded-xl border border-neon/30 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                    </svg>
                                </button>
                            )}
                         </div>

                         {/* Loading Bar */}
                         {isLoading && (
                             <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                 <div className="h-full bg-neon animate-progress shadow-[0_0_10px_#a3e635]"></div>
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
                <h2 className="text-2xl font-mono text-neon mb-6 tracking-widest text-center">Arsip Studio</h2>
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