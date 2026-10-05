import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string, baseUrl?: string, model?: string) => void;
  onClose?: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onClose }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  const parsedKeys = inputKey
    .split(/[\n,;]+/)
    .map(k => k.trim().replace(/^Bearer\s+/i, ''))
    .filter(k => k.length > 0);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('miux_api_key') || '';
      setInputKey(savedKey);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!inputKey.trim()) {
      setError('Silakan masukkan API Key Google AI Studio Anda.');
      return;
    }

    // Set base URL empty (official Google AI Studio endpoint) and model auto-rotate
    localStorage.setItem('miux_base_url', '');
    localStorage.setItem('miux_model', 'auto');
    localStorage.setItem('miux_api_key', inputKey.trim());

    onSave(inputKey.trim(), '', 'auto');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />

      {/* Content Container */}
      <div className="relative w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl ring-1 ring-white/5">

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 flex items-center justify-center transition-colors"
            title="Tutup"
          >
            ✕
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-zinc-900 border border-neon/30 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(163,230,53,0.15)]">
            <span className="text-2xl font-mono text-neon font-bold">M</span>
          </div>
          <h2 className="text-xl font-mono tracking-widest text-white mb-1">
            MIUX <span className="text-neon">STUDIO</span>
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Aktivasi Google AI Studio Engine
          </p>
        </div>

        {/* Free API Key Guide */}
        <div className="mb-5 p-4 bg-neon/5 border border-neon/20 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neon uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span> Dapatkan API Key Gratis
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-neon underline hover:text-white transition-colors"
            >
              Buka AI Studio ↗
            </a>
          </div>
          <ol className="text-[11px] text-zinc-300 space-y-1.5 list-decimal list-inside font-sans leading-relaxed">
            <li>Buka <strong className="text-white">aistudio.google.com/app/apikey</strong></li>
            <li>Login akun Google & klik <strong className="text-neon">"Create API key"</strong></li>
            <li>Salin API Key lalu tempelkan pada kolom di bawah</li>
          </ol>
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-neon/80 uppercase tracking-widest">
                API Key Google AI Studio
              </label>
              {parsedKeys.length > 0 && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  parsedKeys.length > 1
                    ? 'bg-neon/15 border-neon text-neon shadow-[0_0_8px_rgba(163,230,53,0.2)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  {parsedKeys.length > 1 ? `⚡ ${parsedKeys.length} Keys Pool (Rotasi Otomatis)` : '1 Key'}
                </span>
              )}
            </div>

            <textarea
              rows={parsedKeys.length > 1 ? 4 : 3}
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                setError('');
              }}
              placeholder="Tempel API Key Google AI Studio Anda di sini... (contoh: AIzaSy...)"
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/20 transition-all font-mono text-xs leading-relaxed resize-none"
            />

            <p className="text-[11px] text-zinc-400 mt-2 font-sans leading-normal">
              💡 <span className="text-zinc-300 font-medium">Auto-Rotation:</span> Model AI (Gemini Flash, Pro, dll) otomatis dirotasi di latar belakang untuk performa maksimal dan anti-kuota limit. Dukung multi-key (pisahkan baris baru).
            </p>

            {error && (
              <p className="text-red-400 text-xs mt-2 font-mono flex items-center gap-1.5">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-3.5 mt-2 bg-neon/15 hover:bg-neon text-neon hover:text-black border border-neon/40 rounded-xl font-bold text-xs tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(163,230,53,0.15)] active:scale-[0.99]"
          >
            SIMPAN & AKTIFKAN ENGINE
          </button>
        </div>

      </div>
    </div>
  );
};

export default ApiKeyModal;
