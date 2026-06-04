import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MapPin, Calendar, Leaf, Info, BookOpen, Navigation, Map as MapIcon, Trash2, CreditCard as Edit2, Plus, ChevronLeft, ChevronRight, Share2, TreePine, Sparkles, Wind, Utensils, Layers, Sprout, Heart, BookmarkPlus, Check, Copy, Globe, Lock, Play, Film, Camera } from 'lucide-react';
import { Pin, NoteEntry } from './PickMap';
import { motion, AnimatePresence } from 'motion/react';
import { getAllPickVideos, getAllPickPhotos } from '../services/localStorageDB';
import { MediaGallery, buildMediaItems, generateVideoThumbnail } from './PhotoGallery';
import { PhotoGallery } from './PhotoGallery';
import { NewNoteModal, NoteImage, JournalDetailModal } from './MyNotes';
import { publishTree, unpublishTree } from '../services/communityPins';
import type { TreeDetails } from '../types/trees';
import { GoogleGenAI } from '@google/genai';

interface TreeProfileProps {
  pin: Pin;
  onClose: () => void;
  onViewOnMap: (pin: Pin) => void;
  onDeleteTree: (id: string, closeProfile?: () => void) => void;
  onEditTree?: (pin: Pin) => void;
  onAddJournalEntry?: (entry: NoteEntry) => void;
  onUploadPhoto?: (file: File) => Promise<string>;
  journalEntries?: NoteEntry[];
  onUpdateJournalEntry?: (entry: NoteEntry) => void;
  onDeleteJournalEntry?: (id: string) => void;
  onCloneTree?: (pin: Pin) => Promise<void>;
  isSharedView?: boolean;
  currentUserId?: string;
}

// ─── Visibility toggle ────────────────────────────────────────────────────────

function VisibilityToggle({ pin, onToggle }: { pin: Pin; onToggle: (isPublic: boolean) => void }) {
  const [pending, setPending] = useState(false);
  const isPublic = !!pin.isPublic;

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      const next = !isPublic;
      if (next) {
        await publishTree(pin);
      } else {
        await unpublishTree(pin.id);
      }
      onToggle(next);
    } catch (err) {
      console.error('[visibility] toggle failed:', err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-[#f4f1e8] rounded-3xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">
        {isPublic ? <Globe size={13} /> : <Lock size={13} />}
        Visibility
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-60 ${isPublic ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#e8e4d9]'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isPublic ? 'bg-amber-500' : 'bg-[#e8e4d9]'}`}>
            {isPublic ? <Globe size={15} className="text-white" /> : <Lock size={15} className="text-gray-500" />}
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold leading-tight ${isPublic ? 'text-amber-800' : 'text-[#0a3610]'}`}>
              {isPublic ? 'Shared with Community' : 'Private'}
            </p>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
              {isPublic ? 'Visible on the discovery map' : 'Only visible to you'}
            </p>
          </div>
        </div>
        {/* Toggle pill */}
        <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${isPublic ? 'bg-amber-500' : 'bg-[#d1cbb8]'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${pending ? 'opacity-50' : ''} ${isPublic ? 'left-6' : 'left-1'}`} />
        </div>
      </button>
    </div>
  );
}

// ─── Media thumbnail strip ────────────────────────────────────────────────────

interface MediaStripProps {
  photos: string[];
  videos: string[];
  activePhotoIndex: number;
  onSelectPhoto: (idx: number) => void;
  onSelectVideo: (idx: number) => void;
}

function VideoThumb({ src, onClick }: { src: string; onClick: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    generateVideoThumbnail(src).then(t => { if (t) setThumb(t); });
  }, [src]);

  return (
    <button
      onClick={onClick}
      className="relative shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 border-transparent hover:border-amber-400 transition-all active:scale-95 bg-black/40"
    >
      {thumb
        ? <img src={thumb} alt="Video" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center bg-black/60"><Film size={20} className="text-white/40" /></div>
      }
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center border border-white/30">
          <Play size={12} className="text-white fill-white ml-0.5" />
        </div>
      </div>
      {/* amber accent bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-400 opacity-80" />
    </button>
  );
}

function MediaStrip({ photos, videos, activePhotoIndex, onSelectPhoto, onSelectVideo }: MediaStripProps) {
  const total = photos.length + videos.length;
  if (total <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-6 py-3 scrollbar-hide shrink-0">
      {photos.map((src, i) => (
        <button
          key={`p-${i}`}
          onClick={() => onSelectPhoto(i)}
          className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 ${i === activePhotoIndex ? 'border-[#0a3610] scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
        >
          <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
        </button>
      ))}
      {videos.map((src, i) => (
        <React.Fragment key={`v-${i}`}>
          <VideoThumb src={src} onClick={() => onSelectVideo(i)} />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TreeProfile({ pin, onClose, onViewOnMap, onDeleteTree, onEditTree, onAddJournalEntry, onUpdateJournalEntry, onDeleteJournalEntry, onUploadPhoto, journalEntries = [], onCloneTree, currentUserId = 'local' }: TreeProfileProps) {
  const { details, imageUrl, imageUrls, address, locationDescription, notes, dateAdded } = pin;

  const [localUrls, setLocalUrls] = useState<string[]>([]);
  const [localVideos, setLocalVideos] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPin, setEditedPin] = useState<Pin>(pin);
  const [showNewNote, setShowNewNote] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<number | null>(null);
  const [fullScreenVideoIndex, setFullScreenVideoIndex] = useState<number | null>(null);
  const [currentPin, setCurrentPin] = useState<Pin>(pin);
  const [shareCopied, setShareCopied] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<NoteEntry | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAiLookup = async () => {
    const name = editedPin.details.commonName?.trim();
    if (!name) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        contents: `You are a botanical expert. Given the common name "${name}", return ONLY a JSON object with these fields:
{
  "scientificName": "...",
  "description": "2-3 sentence botanical description",
  "tasteDescription": "...",
  "texture": "...",
  "climateConditions": "...",
  "growingTips": "...",
  "healthBenefits": ["...", "...", "..."]
}
Return only valid JSON, no markdown, no explanation.`,
      });
      const raw = response.text?.replace(/\`\`\`json|\`\`\`/g, '').trim() || '';
      const data = JSON.parse(raw);
      setEditedPin(prev => ({
        ...prev,
        details: {
          ...prev.details,
          scientificName: data.scientificName || prev.details.scientificName,
          description: data.description || prev.details.description,
          tasteDescription: data.tasteDescription || prev.details.tasteDescription,
          texture: data.texture || prev.details.texture,
          climateConditions: data.climateConditions || prev.details.climateConditions,
          growingTips: data.growingTips || prev.details.growingTips,
          healthBenefits: data.healthBenefits || prev.details.healthBenefits,
        },
      }));
    } catch (err) {
      console.error('[AI Lookup] failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const isOwner = currentPin.uid === currentUserId;

  // Load photos from API store
  useEffect(() => {
    getAllPickPhotos(currentPin.id).then(urls => {
      if (urls.length > 0) setLocalUrls(urls);
    });
  }, [currentPin.id, isEditing]);

  // Load videos from API store
  useEffect(() => {
    getAllPickVideos(currentPin.id).then(vids => {
      if (vids.length > 0) setLocalVideos(vids);
      else if (currentPin.videoUrls?.length) setLocalVideos(currentPin.videoUrls);
    });
  }, [currentPin.id]);

  const hasRealRemoteUrls = imageUrls && imageUrls.length > 0 && imageUrls.some(u => u.startsWith('http'));
  const displayImages = hasRealRemoteUrls
    ? imageUrls!.filter(u => u.startsWith('http'))
    : (localUrls.length > 0 ? localUrls : (imageUrl && imageUrl !== 'pending' ? [imageUrl] : []));

  const displayImage = displayImages[currentImageIndex] || null;

  const handleNavigate = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const url = isIOS
      ? `http://maps.apple.com/?daddr=${currentPin.lat},${currentPin.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${currentPin.lat},${currentPin.lng}`;
    window.open(url, '_blank');
  };

  const handleDelete = () => onDeleteTree(currentPin.id, onClose);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/tree/${currentPin.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: details.commonName, text: `Check out this ${details.commonName} I found in The Orchard Guide!`, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch { /* cancelled */ }
  };

  const handleClone = async () => {
    if (!onCloneTree || isCloning) return;
    setIsCloning(true);
    try {
      await onCloneTree(currentPin);
      setCloneSuccess(true);
      setTimeout(() => setCloneSuccess(false), 3000);
    } finally {
      setIsCloning(false);
    }
  };

  const handleVisibilityToggle = useCallback((isPublic: boolean) => {
    const updated: Pin = { ...currentPin, isPublic };
    setCurrentPin(updated);
    if (onEditTree) onEditTree(updated);
  }, [currentPin, onEditTree]);

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[150] bg-[#fdfbf7] flex flex-col overflow-hidden"
    >
      {/* ── Hero ── */}
      <div className="relative h-[45vh] shrink-0 group">
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt={details.commonName}
              className="w-full h-full object-cover cursor-pointer"
              referrerPolicy="no-referrer"
              onClick={() => setFullScreenPhotoIndex(currentImageIndex)}
            />
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? displayImages.length - 1 : prev - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setCurrentImageIndex(prev => prev === displayImages.length - 1 ? 0 : prev + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {displayImages.map((_, idx) => (
                    <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-[#e8e4d9] flex flex-col items-center justify-center gap-3 text-[#0a3610]/20">
            <TreePine size={64} />
            <span className="text-xs font-medium text-[#0a3610]/30 uppercase tracking-widest">No Photo</span>
          </div>
        )}

        {/* Top Actions */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <button onClick={onClose} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#0a3610] shadow-sm hover:bg-white transition-colors active:scale-90">
            <X size={20} />
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#0a3610] shadow-sm hover:bg-white transition-colors active:scale-90" title={shareCopied ? 'Link copied!' : 'Share this tree'}>
              {shareCopied ? <Check size={16} className="text-green-600" /> : <Share2 size={16} />}
            </button>
            {isOwner && onEditTree && (
              <button
                onClick={() => {
                  if (!isEditing) {
                    // Bug 1 fix: initialize from currentPin with the currently displayed photos
                    setEditedPin({ ...currentPin, imageUrls: displayImages });
                  }
                  setIsEditing(!isEditing);
                }}
                className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm transition-colors active:scale-90 ${isEditing ? 'bg-[#0a3610] text-white' : 'bg-white/90 text-[#0a3610] hover:bg-white'}`}
              >
                <Edit2 size={16} />
              </button>
            )}
            {isOwner && (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-600 shadow-sm hover:bg-red-50 transition-colors active:scale-90">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={() => onViewOnMap(pin)} className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-[#0a3610] shadow-sm hover:bg-white transition-colors active:scale-90">
              <Navigation size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">View on Map</span>
            </button>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#fdfbf7] to-transparent" />
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto pb-12 relative z-10">
        {/* Media thumbnail strip sits at top, fully in document flow */}
        <MediaStrip
          photos={displayImages}
          videos={localVideos}
          activePhotoIndex={currentImageIndex}
          onSelectPhoto={setCurrentImageIndex}
          onSelectVideo={idx => setFullScreenVideoIndex(idx)}
        />
        <div className="space-y-8 px-8 pt-4">
          {isEditing ? (
            <div className="space-y-6 bg-white p-6 rounded-3xl shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#8b6b55] uppercase tracking-widest mb-2">Common Name</label>
                  <input type="text" value={editedPin.details.commonName} onChange={e => setEditedPin({ ...editedPin, details: { ...editedPin.details, commonName: e.target.value } })} className="w-full bg-[#fdfbf7] border border-[#e8e4d9] rounded-xl px-4 py-3 text-[#0a3610] focus:outline-none focus:border-[#8b6b55] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8b6b55] uppercase tracking-widest mb-2">Scientific Name</label>
                  <input type="text" value={editedPin.details.scientificName || ''} onChange={e => setEditedPin({ ...editedPin, details: { ...editedPin.details, scientificName: e.target.value } })} className="w-full bg-[#fdfbf7] border border-[#e8e4d9] rounded-xl px-4 py-3 text-[#0a3610] focus:outline-none focus:border-[#8b6b55] transition-colors" />
                </div>
                <button
                  type="button"
                  onClick={handleAiLookup}
                  disabled={isAiLoading || !editedPin.details.commonName?.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-widest hover:bg-amber-100 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {isAiLoading
                    ? <><span className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" /> Looking up…</>
                    : <><Sparkles size={14} /> AI Botanical Lookup</>}
                </button>
                <div>
                  <label className="block text-xs font-bold text-[#8b6b55] uppercase tracking-widest mb-2">Description</label>
                  <textarea value={editedPin.details.description || ''} onChange={e => setEditedPin({ ...editedPin, details: { ...editedPin.details, description: e.target.value } })} className="w-full bg-[#fdfbf7] border border-[#e8e4d9] rounded-xl px-4 py-3 text-[#0a3610] focus:outline-none focus:border-[#8b6b55] transition-colors min-h-[100px]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8b6b55] uppercase tracking-widest mb-2">Photos</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editedPin.imageUrls?.map((url, index) => (
                      <div key={index} className="relative w-16 h-16">
                        <img src={url} alt="Tree" className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = [...(editedPin.imageUrls || [])];
                            newUrls.splice(index, 1);
                            setEditedPin({ ...editedPin, imageUrls: newUrls });
                          }}
                          className="absolute -top-1 -right-1 bg-white rounded-full text-red-600 shadow-sm hover:bg-red-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Hidden camera input (capture from device camera) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async e => {
                      if (e.target.files?.[0] && onUploadPhoto) {
                        const url = await onUploadPhoto(e.target.files[0]);
                        setEditedPin(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), url] }));
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    {/* Camera capture button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#0a3610] text-white rounded-xl text-xs font-bold hover:bg-[#052e16] transition-colors active:scale-95"
                    >
                      <Camera size={14} />
                      Take Photo
                    </button>
                    {/* File picker for existing photos */}
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-[#0a3610] text-[#0a3610] rounded-xl text-xs font-bold hover:bg-[#0a3610]/5 transition-colors active:scale-95 cursor-pointer">
                      <Plus size={14} />
                      Add from Library
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async e => {
                          if (e.target.files && e.target.files.length > 0 && onUploadPhoto) {
                            const newUrls: string[] = [];
                            for (let i = 0; i < e.target.files.length; i++) {
                              const url = await onUploadPhoto(e.target.files[i]);
                              newUrls.push(url);
                            }
                            setEditedPin(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), ...newUrls] }));
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8b6b55] uppercase tracking-widest mb-2">Location Notes</label>
                  <input type="text" value={editedPin.locationDescription || ''} onChange={e => setEditedPin({ ...editedPin, locationDescription: e.target.value })} className="w-full bg-[#fdfbf7] border border-[#e8e4d9] rounded-xl px-4 py-3 text-[#0a3610] focus:outline-none focus:border-[#8b6b55] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8b6b55] uppercase tracking-widest mb-2">Personal Notes</label>
                  <textarea value={editedPin.notes || ''} onChange={e => setEditedPin({ ...editedPin, notes: e.target.value })} className="w-full bg-[#fdfbf7] border border-[#e8e4d9] rounded-xl px-4 py-3 text-[#0a3610] focus:outline-none focus:border-[#8b6b55] transition-colors min-h-[100px]" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#e8e4d9]">
                <button
                  onClick={() => { setEditedPin(currentPin); setIsEditing(false); }}
                  className="px-6 py-3 rounded-xl text-[#8b6b55] font-medium hover:bg-[#f4f1e8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onEditTree) onEditTree(editedPin);
                    setCurrentPin(editedPin);
                    setIsEditing(false);
                  }}
                  className="px-6 py-3 bg-[#0a3610] text-white rounded-xl font-medium hover:bg-[#052e16] transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Title & Basic Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#8b6b55] uppercase tracking-widest">
                  <Leaf size={12} />
                  {details.scientificName || 'Botanical Specimen'}
                </div>
                <h1 className="font-serif italic text-4xl text-[#0a3610] leading-tight">{details.commonName}</h1>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    Found {new Date(dateAdded).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Clone to My Trees — shown only for non-owners */}
              {!isOwner && onCloneTree && (
                <button
                  onClick={handleClone}
                  disabled={isCloning || cloneSuccess}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-full font-semibold text-sm shadow-[0_6px_20px_rgba(10,54,16,0.15)] transition-all active:scale-95 disabled:opacity-70 ${cloneSuccess ? 'bg-emerald-600 text-white' : 'bg-[#0a3610] hover:bg-[#052e16] text-white'}`}
                >
                  {cloneSuccess
                    ? <><Check size={18} /> Tree added to your collection!</>
                    : isCloning
                      ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                      : <><BookmarkPlus size={18} /> Save to My Journal</>}
                </button>
              )}

              {/* Share copied toast */}
              <AnimatePresence>
                {shareCopied && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center gap-2 bg-[#0a3610] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg w-fit mx-auto"
                  >
                    <Copy size={13} /> Link copied to clipboard!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Location Card */}
              <div className="bg-[#f4f1e8] rounded-3xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#e8e4d9] p-3 rounded-2xl text-[#8b6b55]">
                      <MapPin size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-[#0a3610] uppercase tracking-widest">Location</p>
                      <p className="text-sm text-[#0a3610] font-medium leading-relaxed">{address || 'Location not specified'}</p>
                      {locationDescription && <p className="text-xs text-gray-500 italic">"{locationDescription}"</p>}
                    </div>
                  </div>
                  <button onClick={handleNavigate} className="shrink-0 bg-[#0a3610] text-white p-3 rounded-2xl shadow-sm hover:bg-[#052e16] transition-colors active:scale-95 flex flex-col items-center justify-center gap-1" title="Navigate to Location">
                    <MapIcon size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Navigate</span>
                  </button>
                </div>
              </div>

              {/* Visibility toggle — owners only */}
              {isOwner && onEditTree && (
                <VisibilityToggle pin={currentPin} onToggle={handleVisibilityToggle} />
              )}

              {/* Botanical Guide */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest border-b border-[#e8e4d9] pb-2">
                  <Info size={14} />
                  Botanical Guide
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {details.description || 'No botanical description available for this specimen.'}
                </p>
              </div>

              {/* Botanical Insights */}
              {(currentPin.details.tasteDescription || currentPin.details.healthBenefits?.length) && (
                <BotanicalInsightsSection details={currentPin.details} />
              )}

              {/* Journal Notes */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest border-b border-[#e8e4d9] pb-2">
                  <BookOpen size={14} />
                  Journal Notes
                </div>
                <div className="bg-white border border-[#e8e4d9] rounded-3xl p-6 shadow-sm">
                  <p className="text-sm text-[#0a3610] leading-relaxed italic">
                    {notes || 'No personal observations recorded for this tree yet.'}
                  </p>
                </div>
              </div>

              {/* Progress Updates */}
              <div className="space-y-4 pt-4 border-t border-[#e8e4d9]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">
                    <Calendar size={14} />
                    Progress Updates
                  </div>
                  {onAddJournalEntry && (
                    <button onClick={() => setShowNewNote(true)} className="flex items-center gap-1 text-[10px] font-bold text-[#0a3610] uppercase tracking-widest bg-[#e8e4d9] px-3 py-1.5 rounded-full hover:bg-[#d8d4c9] transition-colors">
                      <Plus size={12} />
                      Add Update
                    </button>
                  )}
                </div>
                {journalEntries.length > 0 ? (
                  <div className="space-y-4">
                    {[...journalEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <div key={entry.id} onClick={() => setSelectedJournalEntry(entry)} className="bg-white border border-[#e8e4d9] rounded-3xl p-5 shadow-sm space-y-3 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <h3 className="font-serif italic text-xl text-[#0a3610]">{entry.title}</h3>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{entry.content}</p>
                        {(entry.photos.length > 0 || (entry.uid === 'guest' && entry.photoCount && entry.photoCount > 0)) && (
                          <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                            {Array.from({ length: entry.photos?.length || entry.photoCount || 0 }).map((_, i) => (
                              <NoteImage key={i} entry={entry} photoIndex={i} className="w-20 h-20 object-cover rounded-xl shrink-0 snap-start" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#f4f1e8] rounded-3xl p-6 text-center">
                    <p className="text-sm text-gray-500 italic">No progress updates yet. Add one to track this tree's growth!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showNewNote && onAddJournalEntry && (
        <NewNoteModal
          onClose={() => setShowNewNote(false)}
          onSave={entry => { onAddJournalEntry({ ...entry, treeId: pin.id }); setShowNewNote(false); }}
          initialTitle={`Update on ${details.commonName}`}
        />
      )}

      {/* Journal entry detail / edit */}
      {selectedJournalEntry && (
        <JournalDetailModal
          entry={selectedJournalEntry}
          onClose={() => setSelectedJournalEntry(null)}
          onSave={(updated) => { if (onUpdateJournalEntry) onUpdateJournalEntry(updated); setSelectedJournalEntry(null); }}
          onDelete={(id) => { if (onDeleteJournalEntry) onDeleteJournalEntry(id); setSelectedJournalEntry(null); }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 max-w-xs w-full space-y-6">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} /></div>
              <h3 className="font-serif italic text-2xl text-[#0a3610]">Delete Tree?</h3>
              <p className="text-sm text-gray-500">Are you sure you want to remove this tree from your collection? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-[#0a3610] bg-[#f4f1e8] hover:bg-[#e8e4d9] transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">Delete</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Full-screen photo lightbox */}
      {fullScreenPhotoIndex !== null && (
        <PhotoGallery
          photos={displayImages}
          initialIndex={fullScreenPhotoIndex}
          onClose={() => setFullScreenPhotoIndex(null)}
        />
      )}

      {/* Full-screen video lightbox */}
      {fullScreenVideoIndex !== null && (
        <MediaGallery
          items={buildMediaItems([], localVideos)}
          initialIndex={fullScreenVideoIndex}
          treeName={details.commonName}
          onClose={() => setFullScreenVideoIndex(null)}
        />
      )}
    </motion.div>
  );
}

// ─── Botanical Insights section ───────────────────────────────────────────────

function InsightCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-[#e8e4d9] rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-[#8b6b55]">
        {icon}
        <p className="text-[9px] font-bold uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-sm text-[#0a3610] leading-relaxed">{value}</p>
    </div>
  );
}

function BotanicalInsightsSection({ details }: { details: TreeDetails }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest border-b border-[#e8e4d9] pb-2">
        <Sparkles size={14} />
        Botanical Insights
      </div>
      <div className="space-y-3">
        {details.tasteDescription && <InsightCard icon={<Utensils size={13} />} label="Taste" value={details.tasteDescription} />}
        {details.texture && <InsightCard icon={<Layers size={13} />} label="Texture" value={details.texture} />}
        {details.climateConditions && <InsightCard icon={<Wind size={13} />} label="Climate Conditions" value={details.climateConditions} />}
        {details.growingTips && <InsightCard icon={<Sprout size={13} />} label="Growing Tips" value={details.growingTips} />}
        {details.healthBenefits && details.healthBenefits.length > 0 && (
          <div className="bg-[#f4f1e8] border border-[#e8e4d9] rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#8b6b55]">
              <Heart size={13} />
              <p className="text-[9px] font-bold uppercase tracking-widest">Health Benefits</p>
            </div>
            <ul className="space-y-1.5">
              {details.healthBenefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#0a3610]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0a3610] shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
