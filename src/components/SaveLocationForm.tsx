import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader as Loader2, Camera, ChevronDown, Globe, Video, Play, Users } from 'lucide-react';
import { savePickPhoto, savePickVideo } from '../services/localStorageDB';
import { Pin } from './PickMap';
import { ErrorModal } from './ErrorModal';
import { BotanicalEntry } from '../types/trees';
import { useBotanicalSearch } from '../hooks/useBotanicalSearch';
import { generateVideoThumbnail } from './PhotoGallery';

interface SaveLocationFormProps {
  lat: number;
  lng: number;
  address: string;
  onSave: (pick: Pin, base64Photos: string[]) => void;
  onCancel: () => void;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SaveLocationForm({ lat, lng, address, onSave, onCancel }: SaveLocationFormProps) {
  const [locationDescription, setLocationDescription] = useState('');
  const [query, setQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<BotanicalEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Videos
  const [videos, setVideos] = useState<File[]>([]);
  const [videoThumbs, setVideoThumbs] = useState<(string | null)[]>([]);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Community sharing
  const [isPublic, setIsPublic] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestions = useBotanicalSearch(query);

  // Photo previews
  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f));
    setPhotoPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [photos]);

  // Video thumbnails
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const thumbs = await Promise.all(
        videos.map(f => generateVideoThumbnail(URL.createObjectURL(f)))
      );
      if (!cancelled) setVideoThumbs(thumbs);
    })();
    return () => { cancelled = true; };
  }, [videos]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (entry: BotanicalEntry) => {
    setSelectedEntry(entry);
    setQuery(entry.name);
    setNotes(buildNotes(entry));
    setIsDropdownOpen(false);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedEntry(null);
    setIsDropdownOpen(true);
  };

  const handleClearSelection = () => {
    setSelectedEntry(null);
    setQuery('');
    setNotes('');
  };

  const handlePhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleVideoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    // Warn if any video exceeds ~100 MB (rough guard for memory)
    const oversized = files.filter((f: File) => f.size > 100 * 1024 * 1024);
    if (oversized.length > 0) {
      setModalError('One or more videos are very large. Please keep clips short (under 10 seconds) for best performance.');
      return;
    }
    setVideos(prev => [...prev, ...files]);
  };

  const treeName = selectedEntry?.name ?? query.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!treeName) {
      setModalError('Please enter or select a tree name before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const id = crypto.randomUUID();

      const base64Photos = await Promise.all(photos.map(fileToBase64));
      for (let i = 0; i < base64Photos.length; i++) {
        await savePickPhoto(id, i, base64Photos[i]);
      }

      const base64Videos = await Promise.all(videos.map(fileToBase64));
      for (let i = 0; i < base64Videos.length; i++) {
        await savePickVideo(id, i, base64Videos[i]);
      }

      const newPick: Pin = {
        id,
        uid: 'local',
        lat,
        lng,
        details: {
          commonName: treeName,
          scientificName: selectedEntry?.botanicalName,
          description: selectedEntry?.notes,
          tasteDescription: selectedEntry?.tasteDescription,
          texture: selectedEntry?.texture,
          climateConditions: selectedEntry?.climateConditions,
          growingTips: selectedEntry?.growingTips,
          healthBenefits: selectedEntry?.healthBenefits,
          growingZone: selectedEntry?.growingZone,
          harvestWindow: selectedEntry?.harvestWindow,
          region: selectedEntry?.region,
        },
        locationDescription,
        notes,
        address,
        dateAdded: new Date().toISOString(),
        imageUrls: base64Photos,
        videoUrls: base64Videos,
        isPublic,
      };
      onSave(newPick, base64Photos);
    } catch (err) {
      console.error('Local save failed:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[90] bg-[#fdfbf7] flex flex-col overflow-hidden">
      <ErrorModal error={modalError} onClose={() => setModalError(null)} />

      {/* Header */}
      <div className="sticky top-0 bg-[#fdfbf7]/90 backdrop-blur-md pt-6 pb-4 px-6 flex justify-between items-center z-10 border-b border-[#e8e4d9]">
        <h2 className="font-serif italic text-2xl text-[#0a3610]">Save Location</h2>
        <button type="button" onClick={onCancel} className="text-sm font-bold text-[#0a3610] uppercase tracking-wider">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <form id="save-location-form" onSubmit={handleSubmit} className="space-y-6">

          {/* Location */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Location</h3>
            <div className="bg-[#f4f1e8] rounded-2xl p-4 flex items-start gap-3 border border-[#e8e4d9]">
              <MapPin size={20} className="text-[#8b6b55] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#0a3610] mb-1">{address}</p>
                <p className="text-xs font-mono text-gray-500">
                  {Math.abs(lat).toFixed(4)}° {lat >= 0 ? 'N' : 'S'}, {Math.abs(lng).toFixed(4)}° {lng >= 0 ? 'E' : 'W'}
                </p>
              </div>
            </div>
            <input
              type="text"
              placeholder="Location description (e.g., Behind the old library)"
              value={locationDescription}
              onChange={e => setLocationDescription(e.target.value)}
              className="w-full bg-white border border-[#e8e4d9] rounded-xl px-4 py-3 text-sm text-[#0a3610] placeholder-gray-400 focus:outline-none focus:border-[#0a3610]"
            />
          </div>

          {/* Tree / Plant Identity */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Tree / Plant Identity</h3>

            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search — e.g. Mango, Kesar, Guava, Apple…"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-white border border-[#e8e4d9] rounded-xl px-4 py-3 pr-10 text-sm text-[#0a3610] placeholder-gray-400 focus:outline-none focus:border-[#0a3610]"
                  autoComplete="off"
                />
                <ChevronDown
                  size={16}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-200 pointer-events-none ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {isDropdownOpen && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#e8e4d9] rounded-2xl shadow-xl z-30 overflow-hidden max-h-64 overflow-y-auto">
                  {suggestions.map(entry => (
                    <button
                      key={entry.id}
                      type="button"
                      onMouseDown={() => handleSelect(entry)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f4f1e8] transition-colors border-b border-[#f4f1e8] last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0a3610] truncate">{entry.name}</p>
                          <p className="text-[11px] text-gray-400 italic truncate">{entry.botanicalName}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-wider">{entry.harvestWindow}</p>
                          {entry.region && <p className="text-[10px] text-gray-400">{entry.region}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEntry && (
              <div className="bg-[#f4f1e8] rounded-2xl p-4 border border-[#e8e4d9]">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0a3610]">{selectedEntry.name}</p>
                    <p className="text-xs text-gray-500 italic">{selectedEntry.botanicalName}</p>
                  </div>
                  <button type="button" onClick={handleClearSelection} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors mt-0.5">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AutoFillChip label="Growing Zone" value={selectedEntry.growingZone} />
                  <AutoFillChip label="Harvest" value={selectedEntry.harvestWindow} />
                  {selectedEntry.region && <AutoFillChip label="Region" value={selectedEntry.region} icon={<Globe size={10} />} />}
                </div>
              </div>
            )}

            {!selectedEntry && query && (
              <p className="text-[11px] text-gray-400 pl-1">
                Not in the database? That's fine — your entry will be saved as typed.
              </p>
            )}
          </div>

          {/* Field Notes */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Field Notes</h3>
            <textarea
              placeholder="Fruit sweetness, harvest timing, public/private land, condition of tree…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={6}
              className="w-full bg-white border border-[#e8e4d9] rounded-xl px-4 py-3 text-sm text-[#0a3610] placeholder-gray-400 focus:outline-none focus:border-[#0a3610] resize-none"
            />
          </div>

          {/* Photos & Videos */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Photos & Video</h3>

            <div className="flex gap-2 flex-wrap">
              {/* Photo previews */}
              {photoPreviews.map((preview, i) => (
                <div key={`p-${i}`} className="relative w-20 h-20 shrink-0">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-red-500 shadow-sm">
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Video previews */}
              {videos.map((v, i) => (
                <div key={`v-${i}`} className="relative w-20 h-20 shrink-0">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-black/80 flex items-center justify-center">
                    {videoThumbs[i]
                      ? <img src={videoThumbs[i]!} alt="Video thumbnail" className="w-full h-full object-cover" />
                      : <Video size={22} className="text-white/40" />
                    }
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <Play size={14} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setVideos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-red-500 shadow-sm">
                    <X size={13} />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[8px] font-bold text-white bg-black/60 rounded px-1">
                    {(v.size / 1024 / 1024).toFixed(1)}M
                  </span>
                </div>
              ))}

              {/* Add photo button */}
              <input type="file" multiple accept="image/*" capture="environment" ref={photoInputRef} onChange={handlePhotoSelection} className="hidden" />
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-[#d1cbb8] rounded-xl flex flex-col items-center justify-center text-gray-400 hover:bg-[#f4f1e8] hover:border-[#8b6b55] transition-colors active:scale-95">
                <Camera size={20} />
                <span className="text-[9px] mt-1 font-medium">Photo</span>
              </button>

              {/* Add video button */}
              <input
                type="file"
                multiple
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                ref={videoInputRef}
                onChange={handleVideoSelection}
                className="hidden"
              />
              <button type="button" onClick={() => videoInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-[#c5d5b5] rounded-xl flex flex-col items-center justify-center text-[#5a7a4a]/60 hover:bg-[#f0f5ea] hover:border-[#5a7a4a] transition-colors active:scale-95">
                <Video size={20} />
                <span className="text-[9px] mt-1 font-medium">Video</span>
              </button>
            </div>

            <p className="text-[10px] text-gray-400 pl-0.5">
              Keep video clips under 10 seconds for smooth storage.
            </p>
          </div>

          {/* Community Sharing */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Community</h3>
            <button
              type="button"
              onClick={() => setIsPublic(p => !p)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isPublic ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#e8e4d9]'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isPublic ? 'bg-amber-500' : 'bg-[#f4f1e8]'}`}>
                  <Users size={18} className={isPublic ? 'text-white' : 'text-gray-400'} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isPublic ? 'text-amber-800' : 'text-[#0a3610]'}`}>Share with the Community</p>
                  <p className="text-[11px] text-gray-400 leading-tight">Visible to everyone on the discovery map</p>
                </div>
              </div>
              {/* Toggle switch */}
              <div className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${isPublic ? 'bg-amber-500' : 'bg-[#e8e4d9]'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${isPublic ? 'left-7' : 'left-1'}`} />
              </div>
            </button>
            {isPublic && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
                Location, tree name, and notes will be visible on the public map. Photos are included if they are small enough.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#0a3610] hover:bg-[#052e16] text-white font-semibold py-4 rounded-full shadow-[0_8px_20px_rgba(10,54,16,0.2)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
              {isSaving ? 'Saving…' : 'Pin to My Map'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function AutoFillChip({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e8e4d9] rounded-xl px-3 py-2">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
        {icon}{label}
      </p>
      <p className="text-xs font-semibold text-[#0a3610] leading-tight">{value}</p>
    </div>
  );
}

function buildNotes(entry: BotanicalEntry): string {
  const lines: string[] = [];
  lines.push(entry.botanicalName);
  if (entry.region) lines.push(`Region: ${entry.region}`);
  lines.push(`Growing Zone: ${entry.growingZone}`);
  lines.push(`Harvest Window: ${entry.harvestWindow}`);
  lines.push('');
  lines.push(entry.notes);
  return lines.join('\n');
}
