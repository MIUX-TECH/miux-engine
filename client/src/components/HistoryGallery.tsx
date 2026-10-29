import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../types';
import { getAllHistory, deleteHistoryItem, clearAllHistory } from '../services/historyService';

interface HistoryGalleryProps {
  onLoadItem: (item: HistoryItem) => void;
  isActive: boolean;
}

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ onLoadItem, isActive }) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllHistory();
      // FILTER: ONLY SHOW OUTFIT MODE
      const outfitItems = data.filter(item => item.mode === 'outfit');
      setItems(outfitItems);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
        await deleteHistoryItem(id);
        setItems((prev: HistoryItem[]) => prev.filter((item: HistoryItem) => item.id !== id));
    } catch (err) {
        console.error(err);
    }
  };

  const handleClearAll = async () => {
      try {
          await clearAllHistory();
          setItems([]);
      } catch (err) {
          console.error(err);
      }
  }

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-red-400 font-mono text-xs tracking-widest uppercase animate-pulse">Memuat Arsip Proyek...</p>
        </div>
      );
  }

  if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 text-center backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
          </div>
          <h3 className="text-base font-mono font-bold text-zinc-400 mb-1">ARSIP KOSONG</h3>
          <p className="text-xs text-zinc-600 font-mono">Belum ada karya studio yang tersimpan di memori lokal.</p>
        </div>
      );
  }

  return (
    <div className="animate-fade-in w-full pb-20 px-2">
        <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
              {items.length} PROYEK TERSIMPAN
            </span>
            <button
                onClick={handleClearAll}
                className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 hover:text-red-400 px-3 py-1 rounded-lg border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/20 transition-all"
            >
                HAPUS SEMUA
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {items.map((item: HistoryItem) => (
                <div
                    key={item.id}
                    onClick={() => onLoadItem(item)}
                    className="group relative bg-zinc-950/80 border border-zinc-800/80 hover:border-red-600/60 rounded-2xl transition-all cursor-pointer overflow-hidden shadow-xl hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                >
                    <div className="aspect-[4/5] relative transition-all duration-700">
                         <img
                            src={`data:${item.image.mimeType};base64,${item.image.base64}`}
                            alt="Project"
                            className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>

                         <button
                            onClick={(e: React.MouseEvent) => handleDelete(e, item.id)}
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-600/50 flex items-center justify-center transition-all backdrop-blur-md"
                            title="Hapus item"
                         >
                            ✕
                         </button>

                         <div className="absolute bottom-3 left-3 right-3">
                             <h4 className="font-bold text-white text-xs line-clamp-1 mb-1 group-hover:text-red-400 transition-colors">
                                {item.analysis.concepts[0]?.title || "Unknown Concept"}
                             </h4>
                             <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                                {new Date(item.timestamp).toLocaleDateString('id-ID')}
                             </p>
                         </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HistoryGallery;