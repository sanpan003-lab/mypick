import { useState, useMemo, useEffect } from 'react';
import { MapPin, Calendar, ListFilter as Filter, ChevronRight, Search, Leaf, LayoutGrid, List, Trash2, TreePine, Play, Film } from 'lucide-react';
import { Pin } from './PickMap';
import { motion, AnimatePresence } from 'motion/react';
import { getPickPhoto, getAllPickPhotos, getAllPickVideos } from '../services/localStorageDB';
import { MediaGallery, buildMediaItems, generateVideoThumbnail } from './PhotoGallery';

interface MyTreesProps {
  pins: Pin[];
  onViewOnMap: (pin: Pin) => void;
  onSelectTree: (pin: Pin) => void;
  onDeleteTree: (id: string) => void;
  userLocation: [number, number] | null;
}

type SortOption = 'recent' | 'species' | 'near';
type ViewMode = 'grid' | 'list';

function usePickCover(pin: Pin) {
  const [idbUrl, setIdbUrl] = useState<string | null>(null);
  useEffect(() => {
    getPickPhoto(pin.id, 0).then(url => { if (url) setIdbUrl(url); });
  }, [pin.id]);
  return pin.imageUrls?.[0] ?? idbUrl;
}

function useCoverIsVideo(pin: Pin) {
  const cover = usePickCover(pin);
  return cover ? cover.startsWith('data:video') : false;
}

function CoverImage({ pin, className }: { pin: Pin; className: string }) {
  const src = usePickCover(pin);
  const isVid = src?.startsWith('data:video');
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (isVid && src) {
      generateVideoThumbnail(src).then(t => { if (t) setThumb(t); });
    }
  }, [isVid, src]);

  if (src) {
    const imgSrc = isVid ? (thumb ?? null) : src;
    return imgSrc
      ? <img src={imgSrc} alt={pin.details.commonName} className={className} loading="lazy" referrerPolicy="no-referrer" />
      : <div className="w-full h-full bg-black/60 flex items-center justify-center"><Film size={28} className="text-white/40" /></div>;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#f4f1e8] text-[#0a3610]/20">
      <TreePine size={36} />
    </div>
  );
}

function useMediaCounts(pin: Pin) {
  const [photoCount, setPhotoCount] = useState(pin.imageUrls?.length ?? 0);
  const [videoCount, setVideoCount] = useState(pin.videoUrls?.length ?? 0);
  useEffect(() => {
    getAllPickPhotos(pin.id).then(p => setPhotoCount(Math.max(p.length, pin.imageUrls?.length ?? 0)));
    getAllPickVideos(pin.id).then(v => setVideoCount(Math.max(v.length, pin.videoUrls?.length ?? 0)));
  }, [pin.id]);
  return { photoCount, videoCount };
}

function useAllMedia(pin: Pin | null) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  useEffect(() => {
    if (!pin) { setPhotos([]); setVideos([]); return; }
    getAllPickPhotos(pin.id).then(idb => setPhotos(idb.length > 0 ? idb : (pin.imageUrls ?? [])));
    getAllPickVideos(pin.id).then(idb => setVideos(idb.length > 0 ? idb : (pin.videoUrls ?? [])));
  }, [pin?.id]);
  return { photos, videos };
}

function VideoPlayOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
        <Play size={20} className="text-white fill-white ml-0.5" />
      </div>
    </div>
  );
}

function MediaBadge({ photoCount, videoCount }: { photoCount: number; videoCount: number }) {
  const total = photoCount + videoCount;
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {photoCount > 0 && (
        <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          {photoCount}
        </span>
      )}
      {videoCount > 0 && (
        <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
          <Play size={8} className="fill-white" />
          {videoCount}
        </span>
      )}
    </div>
  );
}

function GridCard({ pin, index, onSelectTree, onViewOnMap, onOpenGallery }: {
  pin: Pin;
  index: number;
  onSelectTree: (p: Pin) => void;
  onViewOnMap: (p: Pin) => void;
  onOpenGallery: (p: Pin) => void;
}) {
  const { photoCount, videoCount } = useMediaCounts(pin);
  const coverIsVideo = useCoverIsVideo(pin);
  const isTall = index % 5 === 0 || index % 5 === 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', damping: 22, stiffness: 120, delay: (index % 6) * 0.04 }}
      className="group flex flex-col rounded-3xl overflow-hidden shadow-sm cursor-pointer select-none bg-white border border-[#e8e4d9]"
      onClick={() => onSelectTree(pin)}
    >
      {/* ── Photo container — fixed height, never shrinks ── */}
      <div
        className="relative w-full shrink-0 overflow-hidden bg-[#e8e4d9]"
        style={{ height: isTall ? '13rem' : '9rem' }}
      >
        <CoverImage
          pin={pin}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {/* Subtle top-to-bottom scrim so badges are always readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-transparent pointer-events-none" />
        {/* Hover shimmer */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 pointer-events-none" />

        {coverIsVideo && <VideoPlayOverlay />}

        {/* Badges row — top of image */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
          <button
            onClick={e => { e.stopPropagation(); onOpenGallery(pin); }}
            className="flex items-center gap-1"
          >
            <MediaBadge photoCount={photoCount} videoCount={videoCount} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onViewOnMap(pin); }}
            className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-[#0a3610] shadow-sm hover:bg-white transition-colors active:scale-90"
          >
            <MapPin size={12} />
          </button>
        </div>
      </div>

      {/* ── Text block — normal document flow, completely below image ── */}
      <div className="flex flex-col gap-1 p-3">
        <h4 className="font-serif italic text-sm text-[#0a3610] leading-tight line-clamp-2">
          {pin.details.commonName}
        </h4>
        {pin.details.scientificName && (
          <p className="text-[10px] text-gray-400 italic leading-tight truncate">
            {pin.details.scientificName}
          </p>
        )}
        <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
          <Calendar size={9} />
          {new Date(pin.dateAdded).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

function getTreeStatus(pin: Pin) {
  const description = pin.details.description?.toLowerCase() || '';
  const m = new Date().getMonth();
  const isSummer = m >= 5 && m <= 7;
  const isAutumn = m >= 8 && m <= 10;
  const isWinter = m === 11 || m <= 1;
  const isSpring = m >= 2 && m <= 4;
  if (description.includes('summer') && isSummer) return { label: 'In Season', color: 'bg-emerald-100 text-emerald-700' };
  if (description.includes('autumn') && isAutumn) return { label: 'In Season', color: 'bg-emerald-100 text-emerald-700' };
  if (description.includes('winter') && isWinter) return { label: 'In Season', color: 'bg-emerald-100 text-emerald-700' };
  if (description.includes('spring') && isSpring) return { label: 'In Season', color: 'bg-emerald-100 text-emerald-700' };
  if (isWinter) return { label: 'Dormant', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Growing', color: 'bg-sky-100 text-sky-700' };
}

export function MyTrees({ pins, onViewOnMap, onSelectTree, onDeleteTree, userLocation }: MyTreesProps) {
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [treeToDelete, setTreeToDelete] = useState<string | null>(null);
  const [galleryPin, setGalleryPin] = useState<Pin | null>(null);
  const { photos: galleryPhotos, videos: galleryVideos } = useAllMedia(galleryPin);

  const sortedPins = useMemo(() => {
    let result = [...pins];
    if (searchQuery) {
      result = result.filter(p =>
        p.details.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    } else if (sortBy === 'species') {
      result.sort((a, b) => a.details.commonName.localeCompare(b.details.commonName));
    } else if (sortBy === 'near' && userLocation) {
      result.sort((a, b) => {
        const dA = Math.hypot(a.lat - userLocation[0], a.lng - userLocation[1]);
        const dB = Math.hypot(b.lat - userLocation[0], b.lng - userLocation[1]);
        return dA - dB;
      });
    }
    return result;
  }, [pins, sortBy, searchQuery, userLocation]);

  if (pins.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="w-24 h-24 bg-[#f4f1e8] rounded-full flex items-center justify-center text-[#0a3610]/20"
        >
          <Leaf size={48} />
        </motion.div>
        <div className="space-y-2">
          <h3 className="font-serif italic text-2xl text-[#0a3610]">Your orchard is empty.</h3>
          <p className="text-sm text-gray-500 leading-relaxed max-w-[240px] mx-auto">Find a tree and pin it to start your collection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fdfbf7]">
      {/* Header */}
      <div className="px-5 pt-4 pb-4 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif italic text-3xl text-[#0a3610]">
            My Collection
            <span className="text-base font-sans not-italic text-gray-400 ml-2">({pins.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#f4f1e8] p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-[#0a3610] shadow-sm' : 'text-gray-400'}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-[#0a3610] shadow-sm' : 'text-gray-400'}`}
              >
                <List size={15} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 bg-[#f4f1e8] px-3 py-1.5 rounded-full">
              <Filter size={12} className="text-[#8b6b55]" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-[10px] font-bold text-[#0a3610] uppercase tracking-wider focus:outline-none appearance-none cursor-pointer"
              >
                <option value="recent">Recent</option>
                <option value="species">A–Z</option>
                <option value="near">Near Me</option>
              </select>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search your trees…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#e8e4d9] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#0a3610] placeholder-gray-400 focus:outline-none focus:border-[#0a3610] transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="columns-2 gap-3 space-y-3"
            >
              {sortedPins.map((pin, i) => (
                <div key={pin.id} className="break-inside-avoid mb-3">
                  <GridCard
                    pin={pin}
                    index={i}
                    onSelectTree={onSelectTree}
                    onViewOnMap={onViewOnMap}
                    onOpenGallery={p => setGalleryPin(p)}
                  />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              {sortedPins.map((pin, i) => {
                const status = getTreeStatus(pin);
                const { photoCount, videoCount } = { photoCount: pin.imageUrls?.length ?? 0, videoCount: pin.videoUrls?.length ?? 0 };
                return (
                  <motion.div
                    key={pin.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative rounded-2xl overflow-hidden"
                  >
                    {/* Swipe-to-delete backing — sits behind via z-0 */}
                    <div className="absolute inset-0 z-0 bg-red-50 flex justify-end items-center px-5 rounded-2xl">
                      <button onClick={() => setTreeToDelete(pin.id)} className="text-red-500 flex flex-col items-center gap-1">
                        <Trash2 size={18} />
                        <span className="text-[8px] font-bold uppercase">Delete</span>
                      </button>
                    </div>

                    {/* Draggable card — always on top of delete layer */}
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -72, right: 0 }}
                      dragElastic={0.1}
                      className="relative z-10 bg-white border border-[#e8e4d9] rounded-2xl flex flex-row items-center gap-3 p-3 cursor-pointer active:bg-[#f4f1e8] transition-colors"
                      onClick={() => onSelectTree(pin)}
                    >
                      {/* Thumbnail — explicit dimensions via style so they never collapse */}
                      <div
                        className="relative shrink-0 rounded-xl overflow-hidden bg-[#f4f1e8]"
                        style={{ width: '3.5rem', height: '3.5rem', minWidth: '3.5rem', minHeight: '3.5rem' }}
                        onClick={e => {
                          if (photoCount + videoCount > 0) { e.stopPropagation(); setGalleryPin(pin); }
                        }}
                      >
                        <CoverImage pin={pin} className="w-full h-full object-cover" />
                        {videoCount > 0 && photoCount === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play size={14} className="text-white fill-white drop-shadow" />
                          </div>
                        )}
                      </div>

                      {/* Text block — flex column, normal document flow, cannot overlap thumbnail */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-serif italic text-lg text-[#0a3610] truncate leading-tight">{pin.details.commonName}</h4>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                          <MapPin size={9} />
                          {pin.address || pin.locationDescription || 'Unknown Location'}
                        </p>
                        {(photoCount > 0 || videoCount > 0) && (
                          <div className="flex items-center gap-2 text-[9px] text-gray-400 font-medium">
                            {photoCount > 0 && <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>}
                            {videoCount > 0 && <span className="flex items-center gap-0.5"><Film size={9} />{videoCount} video{videoCount !== 1 ? 's' : ''}</span>}
                          </div>
                        )}
                      </div>

                      <ChevronRight size={15} className="text-gray-300 shrink-0" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {sortedPins.length === 0 && searchQuery && (
          <div className="py-16 text-center space-y-2">
            <p className="text-[#0a3610] font-serif italic text-xl">No matches found</p>
            <p className="text-sm text-gray-400">Try a different search term.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {treeToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-xs w-full space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={22} />
                </div>
                <h3 className="font-serif italic text-2xl text-[#0a3610]">Delete Tree?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setTreeToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-[#0a3610] bg-[#f4f1e8] hover:bg-[#e8e4d9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDeleteTree(treeToDelete); setTreeToDelete(null); }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Lightbox */}
      <AnimatePresence>
        {galleryPin && (galleryPhotos.length > 0 || galleryVideos.length > 0) && (
          <MediaGallery
            items={buildMediaItems(galleryPhotos, galleryVideos)}
            treeName={galleryPin.details.commonName}
            onClose={() => setGalleryPin(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
