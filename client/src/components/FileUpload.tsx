import React, { useRef, useState } from 'react';
import { UploadedImage } from '../types';
import { compressImage } from '../utils/imageOptimizer';

interface FileUploadProps {
  onImageSelected: (image: UploadedImage) => void;
  isLoading: boolean;
  variant?: 'default' | 'compact';
}

const FileUpload: React.FC<FileUploadProps> = ({ onImageSelected, isLoading, variant = 'default' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Mohon upload file gambar.");
      return;
    }

    setIsProcessing(true);
    try {
      const optimizedImage = await compressImage(file);
      onImageSelected(optimizedImage);
    } catch (error) {
      console.error("Compression failed", error);
      alert("Gagal memproses gambar.");
    } finally {
      setIsProcessing(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const containerClasses = variant === 'compact'
    ? 'relative rounded-xl p-4 text-center transition-all duration-300 cursor-pointer group overflow-hidden bg-black/40 border border-dashed border-zinc-800 hover:border-red-600/60 hover:bg-zinc-900/40'
    : 'relative rounded-3xl p-8 sm:p-10 text-center transition-all duration-300 cursor-pointer group overflow-hidden backdrop-blur-xl bg-zinc-950/70 border border-zinc-800 hover:border-red-600/70 hover:bg-zinc-950/90 shadow-2xl';

  const activeClasses = isDragging
    ? 'border-red-500 bg-red-950/30'
    : '';

  return (
    <div
      className={`${containerClasses} ${activeClasses} ${(isLoading || isProcessing) ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept="image/*"
        className="hidden"
      />

      {/* Grid Pattern Background */}
      {variant === 'default' && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-red-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-red-400 font-mono animate-pulse">Mengompresi...</span>
          </div>
        ) : variant === 'default' ? (
          <>
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-red-500 shadow-xl group-hover:scale-105 group-hover:text-white group-hover:bg-red-600 group-hover:border-red-500 transition-all duration-300 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors">
                Upload Foto Produk
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto font-sans">
                Geser file ke sini atau klik untuk menjelajah.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 group-hover:text-red-400 transition-colors">
              Upload Foto
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
