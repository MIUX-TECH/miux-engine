import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { generateSpeech } from '../services/geminiService';
import { NarrationStyle } from '../types';

interface AudioGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  narrationStyle: NarrationStyle;
  apiKey: string;
}

interface VoiceItem {
  name: string;
  gender: 'F' | 'M';
  desc: string;
  archetype: string;
}

const VOICES: VoiceItem[] = [
  { name: 'Kore', gender: 'F', desc: 'Tenang & Natural', archetype: 'Lifestyle / Reviewer' },
  { name: 'Puck', gender: 'M', desc: 'Dinamis & Energik', archetype: 'Streetwear / Trend' },
  { name: 'Charon', gender: 'M', desc: 'Berwibawa & Berat', archetype: 'Editorial / Formal' },
  { name: 'Fenrir', gender: 'M', desc: 'Intens & Sinematik', archetype: 'Storytelling / Deep' },
  { name: 'Zephyr', gender: 'F', desc: 'Lembut & Berbisik', archetype: 'Sensory / Minimalist' },
];

/**
 * Client-side Canvas 9:16 MP4 Exporter
 * Renders a vertical studio card with animated spectrum & studio mic graphic
 */
async function renderAudioToVideoBlob(
  audioDataUrl: string,
  voiceName: string,
  styleName: string,
  onProgress: (percent: number) => void
): Promise<Blob> {
  const response = await fetch(audioDataUrl);
  const arrayBuffer = await response.arrayBuffer();

  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const width = 720;
  const height = 1280;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);

  const dest = audioCtx.createMediaStreamDestination();
  source.connect(analyser);
  analyser.connect(dest);

  const canvasStream: MediaStream | null = (canvas as any).captureStream
    ? (canvas as any).captureStream(30)
    : (canvas as any).webkitCaptureStream
    ? (canvas as any).webkitCaptureStream(30)
    : null;
  if (!canvasStream) throw new Error('Browser tidak mendukung Canvas stream capture.');

  const combinedStream = new MediaStream();
  if (canvasStream.getVideoTracks) {
    canvasStream.getVideoTracks().forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
  }
  if (dest.stream && dest.stream.getAudioTracks) {
    dest.stream.getAudioTracks().forEach((track: MediaStreamTrack) => combinedStream.addTrack(track));
  }

  const candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const mimeType = candidates.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';

  const recorderOptions: MediaRecorderOptions = { videoBitsPerSecond: 2500000 };
  if (mimeType) {
    recorderOptions.mimeType = mimeType;
  }
  const recorder = new MediaRecorder(combinedStream, recorderOptions);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    const totalDuration = audioBuffer.duration;
    const startTime = audioCtx.currentTime;
    let animId: number;

    const drawFrame = () => {
      const elapsed = audioCtx.currentTime - startTime;
      const progress = Math.min(1, elapsed / totalDuration);
      onProgress(Math.round(progress * 100));

      analyser.getByteFrequencyData(frequencyData);

      // Background Obsidian Radial
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2 - 80, 60, width / 2, height / 2, height / 1.4);
      bgGrad.addColorStop(0, '#2b060a');
      bgGrad.addColorStop(0.5, '#0b0b0e');
      bgGrad.addColorStop(1, '#050507');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal studio guide lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 120; y < height; y += 140) {
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(width - 50, y);
        ctx.stroke();
      }

      // Top Studio Header
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(70, 90, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('MIUX STUDIO // AUDIO STEM OVERLAY', 88, 95);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#71717a';
      ctx.fillText('9:16 VERTICAL ASSET • MOBILE CAPCUT & PREMIERE READY', 88, 115);

      // Center Microphone Graphic & Halo
      const centerX = width / 2;
      const centerY = height / 2 - 80;

      let sum = 0;
      for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i];
      const avgVolume = sum / frequencyData.length;
      const pulse = (avgVolume / 255) * 22;

      // Outer Pulse Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, 105 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.15 + (avgVolume / 255) * 0.45})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Middle Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
      ctx.fillStyle = '#121217';
      ctx.fill();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Microphone icon in center
      ctx.save();
      ctx.translate(centerX, centerY);

      // Capsule
      ctx.fillStyle = '#ef4444';
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(-16, -35, 32, 50, 16);
        ctx.fill();
      } else {
        ctx.fillRect(-16, -35, 32, 50);
      }

      // Capsule internal grill lines
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -15);
      ctx.lineTo(12, -15);
      ctx.moveTo(-12, -5);
      ctx.lineTo(12, -5);
      ctx.moveTo(-12, 5);
      ctx.lineTo(12, 5);
      ctx.stroke();

      // U-cradle
      ctx.beginPath();
      ctx.arc(0, -2, 26, 0, Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Stand stem
      ctx.beginPath();
      ctx.moveTo(0, 24);
      ctx.lineTo(0, 42);
      ctx.moveTo(-16, 42);
      ctx.lineTo(16, 42);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.restore();

      // Equalizer Spectrum Visualizer
      const barCount = 20;
      const barWidth = 14;
      const gap = 10;
      const totalVisualizerWidth = barCount * (barWidth + gap) - gap;
      const startX = (width - totalVisualizerWidth) / 2;
      const visualizerY = height / 2 + 110;

      for (let i = 0; i < barCount; i++) {
        const freqIdx = Math.floor((i / barCount) * frequencyData.length);
        const val = frequencyData[freqIdx] || 0;
        const barHeight = Math.max(6, (val / 255) * 110);
        const x = startX + i * (barWidth + gap);

        const barGrad = ctx.createLinearGradient(0, visualizerY, 0, visualizerY - barHeight);
        barGrad.addColorStop(0, '#b91c1c');
        barGrad.addColorStop(1, '#f87171');

        ctx.fillStyle = barGrad;
        if ((ctx as any).roundRect) {
          ctx.beginPath();
          (ctx as any).roundRect(x, visualizerY - barHeight, barWidth, barHeight, 4);
          ctx.fill();
        } else {
          ctx.fillRect(x, visualizerY - barHeight, barWidth, barHeight);
        }
      }

      // Audio Information Box
      const cardY = height - 370;
      ctx.fillStyle = 'rgba(18, 18, 22, 0.9)';
      if ((ctx as any).roundRect) {
        ctx.beginPath();
        (ctx as any).roundRect(50, cardY, width - 100, 190, 16);
        ctx.fill();
      } else {
        ctx.fillRect(50, cardY, width - 100, 190);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      if ((ctx as any).roundRect) {
        ctx.beginPath();
        (ctx as any).roundRect(50, cardY, width - 100, 190, 16);
        ctx.stroke();
      }

      ctx.textAlign = 'left';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('NARRATIVE AUDIO PROFILE', 80, cardY + 40);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(voiceName.toUpperCase(), 80, cardY + 76);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(`Mode: ${styleName.toUpperCase()}`, 80, cardY + 105);

      // Timeline Progress Bar
      const progWidth = width - 160;
      const progY = cardY + 138;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(80, progY, progWidth, 5);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(80, progY, progWidth * progress, 5);

      // Bottom Branding Tag
      ctx.textAlign = 'center';
      ctx.font = '11px monospace';
      ctx.fillStyle = '#52525b';
      ctx.fillText('AUDIO TRACK STEM // OVERLAY VIDEO EXPORT', width / 2, height - 70);

      if (elapsed < totalDuration) {
        animId = requestAnimationFrame(drawFrame);
      }
    };

    recorder.onstop = () => {
      cancelAnimationFrame(animId);
      combinedStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      audioCtx.close().catch(() => {});
      const actualType = recorder.mimeType || mimeType || 'video/mp4';
      const blob = new Blob(chunks, { type: actualType });
      resolve(blob);
    };

    recorder.onerror = (e) => {
      cancelAnimationFrame(animId);
      combinedStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      audioCtx.close().catch(() => {});
      reject(e);
    };

    recorder.start(100);
    source.start(0);
    drawFrame();

    source.onended = () => {
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 300);
    };
  });
}

const AudioGeneratorModal: React.FC<AudioGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialText,
  narrationStyle,
  apiKey,
}) => {
  const [text, setText] = useState(initialText);
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Fenrir');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [isExportingMp4, setIsExportingMp4] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isDialogue = narrationStyle === 'dialogue';

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setAudioUrl(null);
      setExportError(null);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  // Optimize text: Remove excessive blank lines and naturalize speech pauses
  const handleOptimizePauses = () => {
    if (!text) return;
    if (isDialogue) {
      const cleaned = text
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter(Boolean)
        .join('\n');
      setText(cleaned);
    } else {
      const cleaned = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ', ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .replace(/\.\s*\./g, '.')
        .trim();
      setText(cleaned);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() || !apiKey) return;
    setIsGenerating(true);
    setAudioUrl(null);
    setExportError(null);

    try {
      const url = await generateSpeech(apiKey, text, {
        voiceName1: voice1,
        voiceName2: isDialogue ? voice2 : undefined,
        style: narrationStyle,
      });
      setAudioUrl(url);
    } catch (e: any) {
      alert(`Gagal membuat audio: ${e?.message || 'Silakan coba lagi.'}`);
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportMp4 = async () => {
    if (!audioUrl || isExportingMp4) return;
    setIsExportingMp4(true);
    setExportProgress(0);
    setExportError(null);

    try {
      const activeVoice = isDialogue ? `${voice1} & ${voice2}` : voice1;
      const blob = await renderAudioToVideoBlob(
        audioUrl,
        activeVoice,
        narrationStyle || 'monolog',
        (pct) => setExportProgress(pct)
      );

      const mimeType = blob.type;
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `miux-audio-${activeVoice.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export video error:', err);
      setExportError(err?.message || 'Gagal mengekspor video overlay.');
    } finally {
      setIsExportingMp4(false);
      setExportProgress(0);
    }
  };

  const VoiceCardSelector = ({
    selected,
    onSelect,
    label,
  }: {
    selected: string;
    onSelect: (v: string) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block">
        {label}
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {VOICES.map((v) => {
          const isSelected = selected === v.name;
          return (
            <button
              type="button"
              key={v.name}
              onClick={() => onSelect(v.name)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 relative overflow-hidden group ${
                isSelected
                  ? 'bg-red-950/40 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.25)] ring-1 ring-red-500/50'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold font-mono mb-1">
                <span className={isSelected ? 'text-white' : 'text-zinc-200'}>{v.name}</span>
                <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                  isSelected ? 'border-red-500/60 bg-red-900/40 text-red-300' : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}>
                  {v.gender}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 leading-tight truncate">
                {v.desc}
              </div>
              <div className="text-[8px] font-mono text-zinc-600 mt-1 truncate">
                {v.archetype}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-red-600/40 bg-red-950/30 flex items-center justify-center text-red-500 shadow-[0_0_12px_rgba(220,38,38,0.2)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-500 font-bold">
                  Dubbing & VO Studio
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5">
                Sintesis Suara Karakter AI
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/70 text-zinc-400 uppercase">
              {narrationStyle}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors text-xs font-mono"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Voice Selectors */}
          {isDialogue ? (
            <div className="space-y-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
              <VoiceCardSelector selected={voice1} onSelect={setVoice1} label="Speaker A (Host / Tokoh Utama)" />
              <div className="h-px bg-zinc-800/60 w-full" />
              <VoiceCardSelector selected={voice2} onSelect={setVoice2} label="Speaker B (Bintang Tamu / Penanya)" />
              <p className="text-[10px] font-mono text-zinc-500">
                *Gunakan format baris "Speaker A: ..." dan "Speaker B: ..." pada naskah untuk pemisahan suara ganda.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/60">
              <VoiceCardSelector selected={voice1} onSelect={setVoice1} label="Pilih Karakter Vokal (Google AI)" />
            </div>
          )}

          {/* Script Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Naskah Voiceover
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOptimizePauses}
                  title="Hilangkan baris kosong ganda agar ritme narasi padat dan cepat"
                  className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-red-400 hover:border-red-600/40 text-[10px] font-mono flex items-center gap-1.5 transition-colors"
                >
                  <span>✨</span>
                  <span>Rapikan Jeda Baris</span>
                </button>
                <span className="text-[10px] font-mono text-zinc-500">
                  {text.length} karakter
                </span>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              className="w-full h-36 bg-black/60 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 focus:outline-none focus:border-red-600/80 transition-colors custom-scrollbar resize-none font-mono leading-relaxed"
              placeholder="Ketik atau tempel naskah voiceover di sini..."
            />

            {/* Helper tips for styles */}
            {narrationStyle === 'asmr' && (
              <p className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                <span className="text-red-400">ℹ️</span> Mode ASMR: AI secara otomatis menerapkan modulasi volume rendah dan ritme bisikan.
              </p>
            )}
            {narrationStyle === 'hype' && (
              <p className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                <span className="text-red-400">ℹ️</span> Mode Hype: AI secara otomatis menaikkan tempo bicara dan energi artikulasi.
              </p>
            )}
          </div>
        </div>

        {/* Audio Player & Dual Export Bar */}
        {audioUrl && (
          <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-zinc-950/95 border-t border-zinc-800/80 animate-fade-in space-y-3">
            <div className="p-3 rounded-xl border border-red-600/40 bg-red-950/20 flex flex-col sm:flex-row items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(220,38,38,0.4)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 .437-.395.75.75 0 0 1 1.096 1.096 3 3 0 0 1-.84.779l-2.312.66a4.053 4.053 0 0 0-1.85 7.106l-1.32.377a.75.75 0 1 1-.42-1.44l1.32-.377a2.553 2.553 0 1 1 1.403-4.909l-2.311.66a1.5 1.5 0 0 0-.437.395.75.75 0 0 1-1.096-1.096 3 3 0 0 1 .84-.779l2.312-.66a4.053 4.053 0 0 0 1.85-7.106l1.32-.377a.75.75 0 0 1 .858.337Z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">
                    Hasil Sintesis Suara Siap
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    24kHz Mono • Zero Crackle
                  </span>
                </div>
                <audio ref={audioRef} controls src={audioUrl} className="w-full h-8 rounded opacity-90" />
              </div>
            </div>

            {/* DUAL EXPORT BUTTONS: WAV + CANVAS MP4 VIDEO */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <a
                href={audioUrl}
                download={`miux-vo-${isDialogue ? 'duo' : voice1.toLowerCase()}-${Date.now()}.wav`}
                className="px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:border-zinc-700 font-mono text-xs flex items-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5 text-zinc-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" />
                </svg>
                <span>Download WAV</span>
              </a>

              <button
                type="button"
                onClick={handleExportMp4}
                disabled={isExportingMp4}
                className="px-4 py-2 rounded-xl border border-red-600/70 bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.15)] disabled:opacity-50"
              >
                {isExportingMp4 ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Rendering MP4 ({exportProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <span>🎬</span>
                    <span>Export MP4 Video (9:16 Overlay)</span>
                  </>
                )}
              </button>
            </div>

            {exportError && (
              <p className="text-[11px] font-mono text-red-400">
                {exportError}
              </p>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-mono transition-colors"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider flex items-center gap-2 transition-all ${
              isGenerating || !text.trim()
                ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]'
            }`}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Memproses Sintesis...</span>
              </>
            ) : (
              <>
                <span>🎙️</span>
                <span>Generate Voiceover</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AudioGeneratorModal;
