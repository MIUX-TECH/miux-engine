import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string, baseUrl?: string, model?: string) => void;
  onClose?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose }) => {
  const [inputKey, setInputKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:20128');
  const [model, setModel] = useState('ag/gemini-3.7-flash-medium');
  const [error, setError] = useState('');

  const parsedKeys = inputKey
    .split(/[\n,;]+/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  useEffect(() => {
    if (isOpen) {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const defaultHostUrl = isLocal ? `http://${window.location.hostname}:20128` : '';
      const savedKey = localStorage.getItem('miux_api_key') || '';
      const savedBaseUrl = localStorage.getItem('miux_base_url') ?? defaultHostUrl;
      const savedModel = localStorage.getItem('miux_model') || (savedBaseUrl ? 'ag/gemini-3.7-flash-medium' : 'gemini-2.5-flash');

      setInputKey(savedKey);
      setBaseUrl(savedBaseUrl);
      setModel(savedModel);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!inputKey.trim()) {
      setError('API Key tidak boleh kosong');
      return;
    }

    // Normalize model
    let targetModel = model.trim();
    if (targetModel === 'ag/gemini-3.7-flash' || targetModel === 'gemini-3.7-flash') {
      targetModel = 'ag/gemini-3.7-flash-medium';
    }

    localStorage.setItem('miux_base_url', baseUrl.trim());
    localStorage.setItem('miux_model', targetModel);
    localStorage.setItem('miux_api_key', inputKey.trim());

    onSave(inputKey.trim(), baseUrl.trim(), targetModel);
  };

  const applyGoogleStudioPreset = () => {
    setBaseUrl('');
    setModel('gemini-2.5-flash');
    setError('');
  };

  const apply9RouterPreset = () => {
    const currentHost = (typeof window !== 'undefined' && window.location.hostname) ? window.location.hostname : '127.0.0.1';
    setBaseUrl(`http://${currentHost}:20128`);
    setModel('ag/gemini-3.7-flash-medium');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />

      {/* Content */}
      <div className="relative w-full max-w-lg bg-[#0f0f12] border border-white/10 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5 max-h-[90vh] overflow-y-auto">

        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-zinc-900 border border-neon/30 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(163,230,53,0.1)]">
                <span className="text-3xl font-mono text-neon">M</span>
            </div>
            <h2 className="text-2xl font-mono tracking-widest text-white mb-2">MIUX <span className="text-neon">STUDIO</span></h2>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                Konfigurasi AI Engine & Model Provider
            </p>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-2 mb-5">
            <button
                type="button"
                onClick={applyGoogleStudioPreset}
                className={`px-3 py-2.5 text-[10px] font-mono rounded-xl border transition-all flex flex-col items-center gap-1 ${
                    !baseUrl
                    ? 'bg-neon/15 border-neon text-neon shadow-[0_0_12px_rgba(163,230,53,0.2)]'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
            >
                <span className="font-bold tracking-wider">⚡ GOOGLE AI STUDIO</span>
                <span className="text-[9px] opacity-75">Official & Gratis (Gemini)</span>
            </button>
            <button
                type="button"
                onClick={apply9RouterPreset}
                className={`px-3 py-2.5 text-[10px] font-mono rounded-xl border transition-all flex flex-col items-center gap-1 ${
                    baseUrl.includes('20128')
                    ? 'bg-neon/15 border-neon text-neon shadow-[0_0_12px_rgba(163,230,53,0.2)]'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
            >
                <span className="font-bold tracking-wider">● 9ROUTER / PROXY</span>
                <span className="text-[9px] opacity-75">Port 20128 (ag/gemini)</span>
            </button>
        </div>

        {/* Free API Key Direct Guide */}
        {!baseUrl && (
            <div className="mb-5 p-3.5 bg-neon/5 border border-neon/20 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-neon uppercase tracking-wider flex items-center gap-1.5">
                        <span>✨</span> Cara Dapatkan API Key Gratis
                    </span>
                    <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-neon underline hover:text-white transition-colors"
                    >
                        Buka Google AI Studio ↗
                    </a>
                </div>
                <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside font-sans">
                    <li>Kunjungi <strong className="text-zinc-200">aistudio.google.com/app/apikey</strong></li>
                    <li>Login dengan akun Google & klik tombol <strong className="text-neon/90">"Create API key"</strong></li>
                    <li>Salin key (berawalan <code className="text-zinc-300 bg-zinc-800/80 px-1 py-0.5 rounded text-[10px]">AIzaSy...</code>) dan tempel di bawah</li>
                </ol>
            </div>
        )}

        <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-bold text-neon/70 uppercase tracking-widest mb-1.5">
                    Endpoint Base URL
                </label>
                <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="Contoh: http://localhost:20128 (kosongkan untuk default Google)"
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/20 transition-all font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Gunakan <code className="text-neon/80">http://localhost:20128</code> untuk 9router lokal.
                </p>
            </div>

            <div>
                <label className="block text-[10px] font-bold text-neon/70 uppercase tracking-widest mb-1.5">
                    AI Model
                </label>
                <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={baseUrl ? "ag/gemini-3.7-flash-medium" : "gemini-2.5-flash"}
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/20 transition-all font-mono text-xs"
                />
                <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    {baseUrl
                        ? <>Rekomendasi 9router: <code className="text-neon/80">ag/gemini-3.7-flash-medium</code> atau <code className="text-neon/80">ag/gemini-3.8-flash-medium</code></>
                        : <>Rekomendasi Google AI Studio: <code className="text-neon/80">gemini-2.5-flash</code> atau <code className="text-neon/80">gemini-1.5-flash</code> (multimodal cepat & stabil)</>
                    }
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-neon/70 uppercase tracking-widest">
                        API Key (Single / Multi-Key Pool)
                    </label>
                    {parsedKeys.length > 0 && (
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                            parsedKeys.length > 1
                                ? 'bg-neon/15 border-neon text-neon shadow-[0_0_8px_rgba(163,230,53,0.2)]'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}>
                            {parsedKeys.length > 1 ? `⚡ ${parsedKeys.length} Keys (Round-Robin & Failover)` : '1 Key'}
                        </span>
                    )}
                </div>
                <textarea
                    rows={parsedKeys.length > 1 ? 3 : 2}
                    value={inputKey}
                    onChange={(e) => {
                        setInputKey(e.target.value);
                        setError('');
                    }}
                    placeholder="Masukkan token / API Key (dukung multiple key: pisahkan baris baru atau koma)"
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/20 transition-all font-mono text-xs resize-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    Mendukung semua format token/key (bebas prefix). Pisahkan baris baru atau koma untuk multi-key failover otomatis.
                </p>
                {error && <p className="text-red-400 text-xs mt-2 font-medium">⚠️ {error}</p>}
            </div>

            <button 
                onClick={handleSubmit}
                className="w-full py-3 mt-2 bg-neon/10 hover:bg-neon text-neon hover:text-black border border-neon/30 rounded-xl font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(163,230,53,0.1)]"
            >
                SIMPAN & INISIALISASI ENGINE
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;