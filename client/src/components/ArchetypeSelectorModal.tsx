import React, { useState, useMemo } from 'react';

export interface ArchetypeItem {
  id: string;
  value: string;
  label: string;
  category: 'viral' | 'lokal' | 'produk';
  categoryLabel: string;
  description: string;
  tags: string[];
  visualAura: string;
}

export const ARCHETYPES: ArchetypeItem[] = [
  // VIRAL & SUB-KULTUR
  {
    id: 'asian-girl',
    value: 'Viral Cute Asian Girl (TikTok Celeb Aesthetic)',
    label: 'Asian Girl (Viral Cut)',
    category: 'viral',
    categoryLabel: 'Viral & Sub-Kultur',
    description: 'Wajah Asia populer TikTok, natural dewy finish, ekspresi ramah selebgram muda.',
    tags: ['TikTokViral', 'DewySkin', 'Aesthetic'],
    visualAura: 'High-contrast natural daylight, authentic lifestyle candid'
  },
  {
    id: 'korean-guy',
    value: 'Handsome Korean Guy (Long Wolf Cut Hair, Cool Vibe)',
    label: 'Korean Guy (Wolf Cut)',
    category: 'viral',
    categoryLabel: 'Viral & Sub-Kultur',
    description: 'Rambut wolf cut panjang terurai, aura tenang berkarakter, proporsi streetwear kontemporer.',
    tags: ['WolfCut', 'CoolVibe', 'BoyfriendMaterial'],
    visualAura: 'Moody ambient tone, soft cinematic rim light'
  },
  {
    id: 'clean-girl',
    value: 'Clean Girl Aesthetic (Glowing Skin, Minimalist)',
    label: 'Clean Girl (Minimalist)',
    category: 'viral',
    categoryLabel: 'Viral & Sub-Kultur',
    description: 'Tekstur kulit bersih bercahaya tanpa filter tebal, sleek hair, aura tenang dan premium.',
    tags: ['CleanGirl', 'Minimalist', 'QuietLuxury'],
    visualAura: 'Soft diffuse daylight, immaculate clean framing'
  },
  {
    id: 'edgy-y2k',
    value: 'Edgy Y2K Girl (Flash Photography, Cool Attitude)',
    label: 'Edgy Y2K (Flash Photo)',
    category: 'viral',
    categoryLabel: 'Viral & Sub-Kultur',
    description: 'Pencahayaan direct flash tajam, nuansa retro awal 2000-an, attitude berani dan ekspresif.',
    tags: ['Y2KStyle', 'DirectFlash', 'CyberEditorial'],
    visualAura: 'Hard point-and-shoot flash, vibrant saturated shadow'
  },
  {
    id: 'indie-sleaze',
    value: 'Asian Indie Sleaze (Grungy Candid Flash, Messy Rocker)',
    label: 'Asian Indie Sleaze (Rocker Flash)',
    category: 'viral',
    categoryLabel: 'Viral & Sub-Kultur',
    description: 'Candid bergerak terarah, rambut berantakan artistik, estetika underground rock party.',
    tags: ['IndieSleaze', 'MessyHair', 'RawGrain'],
    visualAura: 'Motion blur, raw ISO grain, night party atmosphere'
  },

  // LOKAL & URBAN
  {
    id: 'hijab-muslimah',
    value: 'Hijab Muslimah Model (Fashion & Daily)',
    label: 'Hijab Muslimah (Fashion & Daily)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Lilitan hijab santun anggun, senyum hangat alami, gaya busana muslimah kontemporer.',
    tags: ['ModestFashion', 'DailyHijab', 'Anggun'],
    visualAura: 'Warm sunlit morning, soft pastel contrast'
  },
  {
    id: 'hijab-creator',
    value: 'Hijab Fashion Creator (Modern Pashmina, Trendy)',
    label: 'Hijab Creator (Pashmina)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Styling pashmina modern berlayer, visual konten kreator mode, look dinamis OOTD.',
    tags: ['PashminaTrend', 'FashionCreator', 'Trendy'],
    visualAura: 'Clean cafe setting, crisp smartphone portrait optics'
  },
  {
    id: 'genz-boy',
    value: 'Cool Gen-Z Boy (Streetwear Vibe, Messy Hair)',
    label: 'Gen-Z Boy (Streetwear)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Potongan rambut acak natural, postur santai perkotaan, vibe kasual percaya diri.',
    tags: ['Streetwear', 'GenZUrban', 'CandidCity'],
    visualAura: 'Urban crosswalk, dynamic wide focal length'
  },
  {
    id: 'chindo-girl',
    value: 'Chindo Girl (Luxury & Elegant)',
    label: 'Chindo Girl (Luxury)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Tampilan rapi berkelas, riasan presisi halus, aura modern cosmopolitan dan elegan.',
    tags: ['LuxuryLook', 'Metropolitan', 'Sophisticated'],
    visualAura: 'Luxury boutique backdrop, balanced soft studio lighting'
  },
  {
    id: 'corporate-scbd',
    value: 'Corporate SCBD (Smart Casual, Modern Office)',
    label: 'Corporate SCBD (Smart Casual)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Gaya profesional muda perkotaan, smart-casual blazer/shirt, representasi ritme modern.',
    tags: ['SCBDVibe', 'SmartCasual', 'OfficeModern'],
    visualAura: 'Glass high-rise atrium, neutral overcast daylight'
  },
  {
    id: 'athleisure-runner',
    value: 'Athleisure Runner (Sporty Lifestyle, Fresh Energy)',
    label: 'Athleisure Runner (Sporty)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Estetika kebugaran bertenaga, kilau natural kulit aktif, proporsi sporty yang segar.',
    tags: ['Athleisure', 'SportyFit', 'FreshEnergy'],
    visualAura: 'Golden hour outdoor track, motion energy framing'
  },
  {
    id: 'vintage-indie',
    value: 'Vintage Indie / Blok M (Creative Subculture, Retro Chic)',
    label: 'Vintage Indie (Blok M Style)',
    category: 'lokal',
    categoryLabel: 'Lokal & Urban',
    description: 'Eksplorasi komunitas kreatif skena selatan, kacamata vintage, nuansa hangat analog klasik.',
    tags: ['SkenaBlokM', 'AnalogChic', 'RetroIndie'],
    visualAura: 'Warm tungsten ambient, vintage 35mm film tonality'
  },

  // PRODUK KHUSUS
  {
    id: 'faceless-body',
    value: 'Faceless / Body Only (Focus on Outfit Details)',
    label: 'Faceless (Body Only)',
    category: 'produk',
    categoryLabel: 'Katalog Produk',
    description: 'Framing terpotong leher ke bawah. Fokus mutlak pada drape kain, detail jahitan, dan fitting potongan pakaian.',
    tags: ['FacelessFraming', 'FabricDrape', 'PureFit'],
    visualAura: 'Torso-first composition, deep micro-texture definition'
  },
  {
    id: 'cinematic-review',
    value: 'Cinematic Product Review (Hands Only, Texture Focus, Hanging/Flatlay)',
    label: 'Cinematic Review (Hands Only)',
    category: 'produk',
    categoryLabel: 'Katalog Produk',
    description: 'Interaksi tangan memegang kain, tactile pinch test, framing flatlay atau hanging gantungan studio terfokus.',
    tags: ['HandsOnly', 'MacroTexture', 'FlatlayReview'],
    visualAura: 'Macro depth of field, directional tactile grazing light'
  }
];

interface ArchetypeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelect: (modelValue: string) => void;
}

const ArchetypeSelectorModal: React.FC<ArchetypeSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelect
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'viral' | 'lokal' | 'produk'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArchetypes = useMemo(() => {
    return ARCHETYPES.filter(item => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCat;
      const matchText =
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
      return matchCat && matchText;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-2xl max-h-[88vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-red-500 font-semibold">
                Katalog Subjek & Model
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Pilih Karakter Visual Target
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center transition-colors text-xs font-mono"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/30 flex flex-col gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Cari archetype, gaya, atau tag..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full bg-black/70 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-600/80 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { id: 'all', label: 'Semua (14)' },
              { id: 'viral', label: 'Viral & Sub-Kultur' },
              { id: 'lokal', label: 'Lokal & Urban' },
              { id: 'produk', label: 'Katalog Produk' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-mono tracking-wider transition-all whitespace-nowrap border ${
                  activeCategory === cat.id
                    ? 'bg-red-600/15 border-red-600/60 text-red-400 font-semibold'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 max-h-[58vh]">
          {filteredArchetypes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs">
              Tidak ada archetype yang sesuai dengan kata kunci "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredArchetypes.map((item: ArchetypeItem) => {
                const isSelected = selectedModel === item.value;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                    className={`group relative p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-red-950/20 border-red-600/70 shadow-[0_0_20px_rgba(220,38,38,0.15)] ring-1 ring-red-600/40'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80'
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 group-hover:text-red-400/80 transition-colors">
                        {item.categoryLabel}
                      </span>
                      {isSelected ? (
                        <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-red-600 text-white shrink-0">
                          TERPILIH
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
                          Pilih →
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-xs font-bold tracking-tight mb-1 transition-colors ${
                      isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                    }`}>
                      {item.label}
                    </h3>

                    {/* Description */}
                    <p className="text-[11px] text-zinc-400 leading-relaxed mb-2.5 line-clamp-2">
                      {item.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 border border-zinc-800/90 text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
          <span>{filteredArchetypes.length} Karakter Tersedia</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchetypeSelectorModal;
