import React from 'react';

interface HeaderProps {
  onOpenSettings: () => void;
  onShowWelcome: () => void;
  modelName?: string;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings, onShowWelcome, modelName }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-8 pb-4 bg-gradient-to-b from-dark via-dark/80 to-transparent">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
          {/* Logo Icon */}
          <div className="w-10 h-10 bg-zinc-900 border border-neon/30 rounded flex items-center justify-center group-hover:border-neon transition-colors shadow-[0_0_15px_rgba(163,230,53,0.1)]">
            <span className="text-xl font-mono text-neon">M</span>
          </div>
          <div>
            <h1 className="font-mono text-3xl tracking-widest text-white leading-none group-hover:text-neon transition-colors glitch-text">MIUX</h1>
            <span className="text-[9px] font-bold tracking-[0.3em] text-neon/70 uppercase block">Studio</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-neon/30 text-neon text-[10px] font-mono hover:bg-neon/10 transition-colors"
            title="Klik untuk konfigurasi model/endpoint"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse"></span>
            <span className="truncate max-w-[120px]">{modelName || '9router'}</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:text-neon hover:border-neon/50 transition-all"
            title="Konfigurasi AI Provider"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7 7 0 0 1 0 .255c-.007.38.138.75.431.992l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a7 7 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a7 7 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.241.437-.613.43-.991a7 7 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button 
            onClick={onShowWelcome}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:text-neon hover:border-neon/50 transition-all"
          >
            ?
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
