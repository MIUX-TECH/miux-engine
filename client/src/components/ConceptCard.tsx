import React, { useState, memo, useMemo } from 'react';
import { UGCConcept, Scene, GenerationOptions, UploadedImage } from '../types';
import AudioGeneratorModal from './AudioGeneratorModal';

interface ConceptCardProps {
  concept: UGCConcept;
  index: number;
  defaultOpen?: boolean;
  options: GenerationOptions;
  onRegenerate: () => void;
  isRegenerating: boolean;
  originalImage: UploadedImage | null;
  backImage?: UploadedImage | null;
  apiKey: string;
}

const CopyButton: React.FC<{
  text: string;
  label: string;
  iconPath: string;
  sublabel?: string;
}> = ({ text, label, iconPath, sublabel }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs rounded-xl border text-left transition-all duration-200 group ${
        copied
          ? 'bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
          : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/60'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-1.5 rounded-lg border shrink-0 transition-colors ${
          copied
            ? 'bg-red-600/20 border-red-500 text-red-400'
            : 'bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:text-zinc-300 group-hover:border-zinc-700'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d={iconPath} />
          </svg>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-zinc-400 group-hover:text-zinc-300">
              {label}
            </span>
            {sublabel && (
              <span className="text-[8px] font-mono text-zinc-600 hidden sm:inline">
                {sublabel}
              </span>
            )}
          </div>
          <span className="truncate font-mono text-[11px] text-zinc-300 group-hover:text-white mt-0.5">
            {text}
          </span>
        </div>
      </div>

      <div className="shrink-0 font-mono text-[9px] font-bold px-2 py-1 rounded border transition-colors">
        {copied ? (
          <span className="text-red-400 border-red-500/40 bg-red-950/60">TERPINDAH</span>
        ) : (
          <span className="text-zinc-500 border-zinc-800 bg-zinc-900/80 group-hover:text-zinc-300 group-hover:border-zinc-700">SALIN</span>
        )}
      </div>
    </button>
  );
};

const SceneItem: React.FC<{
  scene: Scene;
  index: number;
  originalImage: UploadedImage | null;
  backImage?: UploadedImage | null;
}> = memo(({ scene, index, originalImage, backImage }) => {
  const isBack = scene.active_reference === 'back';
  const targetThumbnail = isBack && backImage ? backImage.previewUrl : originalImage?.previewUrl;

  return (
    <div className="relative pl-5 sm:pl-7 pb-7 border-l border-zinc-800/80 ml-2 sm:ml-3 group/scene">
      {/* Node Dot on Timeline */}
      <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
        isBack
          ? 'bg-red-600 border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
          : 'bg-zinc-800 border-zinc-600 group-hover/scene:bg-zinc-300 group-hover/scene:border-white'
      }`} />

      {/* Scene Header & Perspective Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
            Scene {index + 1}
          </span>

          {/* PERSPECTIVE SCENE BADGE */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-mono font-semibold tracking-wider ${
            isBack
              ? 'border-red-600/70 bg-red-950/40 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
              : 'border-zinc-700 bg-zinc-900/90 text-zinc-300'
          }`}>
            {targetThumbnail && (
              <img
                src={targetThumbnail}
                alt="Angle Reference"
                className="w-3.5 h-3.5 object-cover rounded-sm border border-black/50"
              />
            )}
            <span>{isBack ? 'TAMPAK BELAKANG' : 'TAMPAK DEPAN'}</span>
          </div>
        </div>

        {scene.voice_direction && (
          <span className="text-[9px] font-mono text-zinc-500 italic">
            Arah Vokal: {scene.voice_direction}
          </span>
        )}
      </div>

      {/* Scene Description Quote */}
      <div className="mb-3.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
          "{scene.description}"
        </p>
      </div>

      {/* Visual & Video Prompt Actions */}
      <div className="space-y-2">
        <CopyButton
          label="PROMPT VISUAL GAMBAR"
          sublabel="(Midjourney / Flux / Imagen)"
          text={scene.imageEditPrompt}
          iconPath="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />

        <CopyButton
          label="PROMPT GERAK VIDEO"
          sublabel="(Kling / Runway / Luma / Sora)"
          text={scene.videoGenPrompt}
          iconPath="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z"
        />
      </div>
    </div>
  );
});

const ConceptCard: React.FC<ConceptCardProps> = memo(({
  concept,
  index,
  defaultOpen = false,
  options,
  onRegenerate,
  isRegenerating,
  originalImage,
  backImage,
  apiKey
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  // Combined Narration Script
  const combinedNarration = useMemo(() => {
    return concept.scenes
      .map((s: Scene) => s.narration)
      .filter((n: string) => n && n.trim() !== '')
      .join('\n\n');
  }, [concept.scenes]);

  // Clean formatted hashtags
  const formattedHashtags = useMemo(() => {
    return (Array.isArray(concept.hashtags) ? concept.hashtags : [])
      .flatMap((tag: string) => (typeof tag === 'string' ? tag.split(/[\s,]+/) : []))
      .map((tag: string) => {
        const clean = String(tag || '').trim().replace(/^#+/, '');
        return clean ? `#${clean}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }, [concept.hashtags]);

  const captionWithHashtags = useMemo(() => {
    return [
      concept.viralCaption?.trim(),
      formattedHashtags
    ].filter(Boolean).join('\n\n');
  }, [concept.viralCaption, formattedHashtags]);

  // Build Full Markdown Brief
  const fullMarkdownBrief = useMemo(() => {
    let md = `# MIUX STUDIO // PRODUCTION BRIEF #${index + 1}\n\n`;
    md += `**Judul Konsep**: ${concept.title}\n`;
    md += `**Strategi**: ${concept.strategy}\n`;
    if (options.narrationStyle) {
      md += `**Gaya Narasi**: ${options.narrationStyle.toUpperCase()}\n`;
    }
    md += `\n---\n\n`;

    md += `## NASKAH DUBBING (VOICE-OVER SCRIPT)\n\n`;
    md += `${combinedNarration || '(Tidak ada naskah narasi)'}\n\n`;

    md += `\n---\n\n`;
    md += `## SCENE BREAKDOWN (${concept.scenes.length} SCENE)\n\n`;

    concept.scenes.forEach((scene: Scene, i: number) => {
      const angle = scene.active_reference === 'back' ? 'TAMPAK BELAKANG' : 'TAMPAK DEPAN';
      md += `### SCENE ${i + 1} [${angle}]\n`;
      md += `**Deskripsi**: ${scene.description}\n\n`;
      if (scene.voice_direction) {
        md += `**Arah Vokal**: ${scene.voice_direction}\n\n`;
      }
      md += `**Visual Prompt**:\n\`\`\`text\n${scene.imageEditPrompt}\n\`\`\`\n\n`;
      md += `**Video Gen Prompt**:\n\`\`\`text\n${scene.videoGenPrompt}\n\`\`\`\n\n`;
    });

    md += `---\n\n`;
    md += `## CAPTION & HASHTAGS\n\n`;
    if (concept.viralCaption) {
      md += `${concept.viralCaption}\n\n`;
    }
    if (formattedHashtags) {
      md += `${formattedHashtags}\n\n`;
    }

    return md;
  }, [concept, index, options, combinedNarration, formattedHashtags]);

  const downloadFile = (filename: string, content: string, contentType: string = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleCopyBrief = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullMarkdownBrief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
    setShowExportMenu(false);
  };

  return (
    <div
      className={`relative border border-zinc-800 rounded-2xl bg-zinc-950/80 backdrop-blur-xl transition-all duration-300 overflow-hidden group hover:border-zinc-700 shadow-xl ${
        isRegenerating ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* CARD HEADER ACCORDION TRIGGER */}
      <div
        onClick={() => !isRegenerating && setIsOpen(!isOpen)}
        className="p-4 sm:p-5 cursor-pointer flex items-center justify-between select-none gap-3 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-center text-sm font-mono font-bold text-red-500 shrink-0 group-hover:border-red-600/50 transition-colors">
            #{index + 1}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 block">
              Konsep Produksi UGC
            </span>
            <h3 className="text-sm sm:text-base font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
              {concept.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* REGENERATE SINGLE CONCEPT BUTTON */}
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (!isRegenerating) onRegenerate();
            }}
            disabled={isRegenerating}
            title="Bangkitkan ulang konsep ini"
            className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className={`w-4 h-4 ${isRegenerating ? 'animate-spin text-red-500' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* ACCORDION CHEVRON */}
          <div className={`w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 flex items-center justify-center transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ACCORDION CONTENT */}
      {isOpen && !isRegenerating && (
        <div className="animate-fade-in border-t border-zinc-800/80 bg-zinc-950/40">

          {/* Strategy & Scene Timeline */}
          <div className="p-4 sm:p-6 space-y-6">
            <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-zinc-800/80">
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                Strategi Kreatif
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                {concept.strategy}
              </p>
            </div>

            {/* SCENES LIST */}
            <div className="space-y-1">
              {concept.scenes.map((scene: Scene, idx: number) => (
                <SceneItem
                  key={idx}
                  scene={scene}
                  index={idx}
                  originalImage={originalImage}
                  backImage={backImage}
                />
              ))}
            </div>
          </div>

          {/* FOOTER ACTIONS: CAPTION & EXPORT CONTROLS */}
          <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/90 space-y-4">
            {/* CAPTION & HASHTAGS COPY BUTTON */}
            <CopyButton
              label="CAPTION KONTEN & HASHTAGS"
              sublabel="(TikTok & Instagram)"
              text={captionWithHashtags}
              iconPath="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
            />

            {/* DUBBING STUDIO & EXPORT BUNDLE BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">

              {/* Dubbing Studio Trigger */}
              <button
                type="button"
                onClick={() => setIsAudioOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-red-600/40 bg-red-950/20 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 font-mono text-xs font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
              >
                <span>🎙️</span>
                <span>Dubbing Studio</span>
              </button>

              {/* Export Brief Bundle Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:border-zinc-700 font-mono text-xs font-semibold tracking-wider transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Export Brief ⤓</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-52 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-30 font-mono text-xs animate-fade-in">
                    <button
                      type="button"
                      onClick={handleCopyBrief}
                      className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>Salin Markdown</span>
                      <span className="text-[10px] text-zinc-500">{copiedBrief ? 'OK' : '📋'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadFile(`concept-${index + 1}-brief.md`, fullMarkdownBrief, 'text/markdown')}
                      className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>Download (.MD)</span>
                      <span className="text-[10px] text-zinc-500">.md</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadFile(`concept-${index + 1}-brief.txt`, fullMarkdownBrief, 'text/plain')}
                      className="w-full text-left px-3 py-2 rounded-lg text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>Download (.TXT)</span>
                      <span className="text-[10px] text-zinc-500">.txt</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DUBBING AUDIO MODAL */}
      <AudioGeneratorModal
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
        initialText={combinedNarration}
        narrationStyle={options.narrationStyle || 'monolog'}
        apiKey={apiKey}
      />
    </div>
  );
});

export default ConceptCard;
