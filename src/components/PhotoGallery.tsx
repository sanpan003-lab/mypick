import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Download, Play } from 'lucide-react';

export interface MediaItem {
  type: 'photo' | 'video';
  src: string;
}

interface MediaGalleryProps {
  items: MediaItem[];
  initialIndex?: number;
  treeName?: string;
  onClose: () => void;
}

/** Converts a flat photo/video arrays into a unified MediaItem list. */
export function buildMediaItems(photos: string[], videos: string[]): MediaItem[] {
  return [
    ...photos.map(src => ({ type: 'photo' as const, src })),
    ...videos.map(src => ({ type: 'video' as const, src })),
  ];
}

function isVideo(src: string) {
  return src.startsWith('data:video') || /\.(mp4|mov|webm|ogg)(\?|$)/i.test(src);
}

function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        referrerPolicy="no-referrer"
        draggable={false}
      />
    </div>
  );
}

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        className="max-w-full max-h-full rounded-lg"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      />
    </div>
  );
}

/** Generates a poster thumbnail from a video blob/data URL. Returns a data URL or null. */
export async function generateVideoThumbnail(src: string): Promise<string | null> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.src = src;
    const cleanup = () => {
      URL.revokeObjectURL(video.src.startsWith('blob:') ? video.src : '');
    };
    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch {
        resolve(null);
      } finally {
        cleanup();
      }
    };
    video.onerror = () => { cleanup(); resolve(null); };
    setTimeout(() => { cleanup(); resolve(null); }, 5000);
  });
}

// Legacy export — keeps TreeProfile working with photo-only arrays
export function PhotoGallery({
  photos,
  initialIndex = 0,
  treeName = 'Photo',
  onClose,
}: {
  photos: string[];
  initialIndex?: number;
  treeName?: string;
  onClose: () => void;
}) {
  const items: MediaItem[] = photos.map(src => ({ type: 'photo', src }));
  return <MediaGallery items={items} initialIndex={initialIndex} treeName={treeName} onClose={onClose} />;
}

export function MediaGallery({ items, initialIndex = 0, treeName = 'Media', onClose }: MediaGalleryProps) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  const go = useCallback((next: number) => {
    const clamped = (next + items.length) % items.length;
    setDirection(next > index ? 1 : -1);
    setIndex(clamped);
  }, [index, items.length]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1);
    else if (info.offset.x > 60) go(index - 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go, onClose]);

  const handleDownload = () => {
    const item = items[index];
    const a = document.createElement('a');
    a.href = item.src;
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    a.download = `${treeName.replace(/\s+/g, '_')}_${item.type}_${index + 1}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  if (items.length === 0) return null;

  const current = items[index];
  const videoCount = items.filter(i => i.type === 'video').length;
  const photoCount = items.filter(i => i.type === 'photo').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[400] bg-black flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 pt-4 pb-3 z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-90"
        >
          <X size={20} />
        </button>

        <div className="text-center">
          <p className="text-white font-serif italic text-base leading-tight">{treeName}</p>
          {items.length > 1 && (
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              {index + 1} / {items.length}
              {videoCount > 0 && photoCount > 0 && (
                <span className="ml-1.5 opacity-70">
                  · {current.type === 'video' ? 'Video' : 'Photo'}
                </span>
              )}
            </p>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); handleDownload(); }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-90"
        >
          <Download size={18} />
        </button>
      </div>

      {/* Media carousel */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
            drag={current.type === 'photo' ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className={`absolute inset-0 ${current.type === 'photo' ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {current.type === 'video'
              ? <VideoPlayer src={current.src} />
              : <LazyImage src={current.src} alt={`${treeName} photo ${index + 1}`} />
            }
          </motion.div>
        </AnimatePresence>

        {items.length > 1 && (
          <>
            <button
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors active:scale-90 z-10"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors active:scale-90 z-10"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div
          className="shrink-0 py-4 pb-6"
          onClick={e => e.stopPropagation()}
        >
          {items.length <= 8 ? (
            <div className="flex items-center justify-center gap-2">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`relative rounded-full transition-all duration-200 overflow-hidden ${
                    i === index ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-75'
                  } ${i === index ? 'w-10 h-10' : 'w-8 h-8'}`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <Play size={12} className="text-white fill-white" />
                    </div>
                  ) : (
                    <img src={item.src} alt="" loading="lazy" className="w-full h-full object-cover" draggable={false} />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-1.5 overflow-x-auto max-w-full px-4 scrollbar-hide">
              {items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === index ? 'border-white scale-110' : 'border-transparent opacity-50'
                  }`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                      <Play size={14} className="text-white fill-white" />
                    </div>
                  ) : (
                    <img src={item.src} alt="" loading="lazy" className="w-full h-full object-cover" draggable={false} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
