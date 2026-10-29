import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl transition-opacity" onClick={onClose} />

      <div className="relative bg-[#0e0e12] border border-zinc-800 rounded-3xl w-full max-w-sm p-7 text-center shadow-2xl ring-1 ring-white/5">
        <div className="w-12 h-12 bg-zinc-950 border border-red-600/60 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(220,38,38,0.25)]">
          <span className="text-xl font-mono text-red-500 font-black">M</span>
        </div>
        <h2 className="text-2xl font-mono text-white mb-1 tracking-widest">
          MIUX <span className="text-red-500">STUDIO</span>
        </h2>
        <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.25em] mb-6">
          Obsidian & Crimson Edition
        </p>

        <div className="space-y-3 text-left text-xs text-zinc-400 mb-6 font-sans bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4">
          <div className="flex items-start gap-2.5">
            <span className="text-red-500 mt-0.5 text-xs">◆</span>
            <p><strong className="text-zinc-200">Creative Production:</strong> Generator konsep fashion & prompt studio multi-angle.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-red-500 mt-0.5 text-xs">◆</span>
            <p><strong className="text-zinc-200">Dubbing & Audio Engine:</strong> Voice synthesis dengan jeda alami dan anti-crackle filter.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="text-red-500 mt-0.5 text-xs">◆</span>
            <p><strong className="text-zinc-200">Canvas MP4 Stems:</strong> Ekspor video 9:16 vertical overlay untuk CapCut & mobile editor.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold font-mono text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] active:scale-[0.99]"
        >
          MASUK WORKSPACE
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;