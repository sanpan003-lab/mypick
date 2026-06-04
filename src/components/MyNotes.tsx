import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Search, Plus, Cloud, Sun, Wind, Droplets, Thermometer, ShoppingBag, Leaf, Sparkles, Camera, X, Smile, MapPin, ChevronRight, ChevronDown, Edit2, Trash2, CloudRain } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NoteEntry } from './PickMap';
import { GoogleGenAI } from "@google/genai";
import { getNotePhoto } from '../services/localStorageDB';
import { PhotoGallery } from './PhotoGallery';

interface MyNotesProps {
  entries: NoteEntry[];
  onAddEntry: (entry: NoteEntry) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry?: (entry: NoteEntry) => void;
}

// Helper component to handle local/remote journal photos
export function NoteImage({ entry, photoIndex, className, onClick }: { entry: NoteEntry, photoIndex: number, className: string, onClick?: () => void, key?: React.Key }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!localUrl) {
      getNotePhoto(entry.id, photoIndex).then(url => url && setLocalUrl(url));
    }
  }, [entry.id, photoIndex]);

  const photoVal = entry.photos && entry.photos[photoIndex];
  const isStorageKey = photoVal?.startsWith('note_') || photoVal === 'pending';
  const src = (!photoVal || isStorageKey) ? localUrl : photoVal;

  if (src) {
    return (
      <img 
        src={src} 
        alt={entry.title} 
        className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
        referrerPolicy="no-referrer"
        onClick={onClick}
      />
    );
  }

  return null;
}

const MOODS = [
  { icon: <Sun size={18} />, label: 'Sunny', color: 'text-yellow-500 bg-yellow-50' },
  { icon: <Smile size={18} />, label: 'Successful', color: 'text-green-500 bg-green-50' },
  { icon: <MapPin size={18} />, label: 'Exploring', color: 'text-blue-500 bg-blue-50' },
  { icon: <Sparkles size={18} />, label: 'Educational', color: 'text-purple-500 bg-purple-50' },
];

export function MyNotes({ entries, onAddEntry, onDeleteEntry, onUpdateEntry }: MyNotesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [fullScreenPhotos, setFullScreenPhotos] = useState<string[] | null>(null);
  const [fullScreenPhotoIndex, setFullScreenPhotoIndex] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<NoteEntry | null>(null);

  const filteredEntries = useMemo(() => {
    return entries
      .filter(entry => 
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.phenologyEvents.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchQuery]);

  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: NoteEntry[] } = {};
    filteredEntries.forEach(entry => {
      const date = new Date(entry.date);
      const key = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const generateAiInsight = async () => {
    if (entries.length === 0) return;
    setIsGeneratingInsight(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const recentEntries = entries.slice(0, 5).map(e => `- ${e.date}: ${e.title}. ${e.content}. Harvest: ${e.harvest?.amount || 'none'}`).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-lite',
        contents: `Based on these recent foraging journal entries, provide a "Weekly Summary" and "Season Outlook" in 2-3 short, encouraging sentences. Focus on trends and what to look for next week.

        Recent Entries:
        ${recentEntries}`,
      });
      
      setAiInsight(response.text || "You're doing great! Keep exploring.");
    } catch (error) {
      console.error("Failed to generate AI insight:", error);
      setAiInsight("Your foraging journey is blossoming! Keep recording your finds to see patterns emerge.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fdfbf7]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-serif italic text-3xl text-[#0a3610]">Journal</h2>
          <button 
            onClick={() => setIsAddingEntry(true)}
            className="w-10 h-10 bg-[#0a3610] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6b55]" size={16} />
          <input 
            type="text" 
            placeholder="Search entries, harvests, or blossoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f4f1e8] border-none rounded-2xl py-3 pl-10 pr-4 text-sm text-[#0a3610] placeholder-[#8b6b55]/50 focus:ring-2 focus:ring-[#0a3610]/10"
          />
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="px-6 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#0a3610] to-[#1a4d20] rounded-3xl p-5 text-white shadow-md relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={80} />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
              <Sparkles size={12} />
              AI Seasonal Outlook
            </div>
            {aiInsight ? (
              <p className="text-sm font-serif italic leading-relaxed">{aiInsight}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm opacity-80">Get a summary of your week and what to expect next.</p>
                <button 
                  onClick={generateAiInsight}
                  disabled={isGeneratingInsight}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-xs font-bold py-2 px-4 rounded-full transition-colors disabled:opacity-50"
                >
                  {isGeneratingInsight ? 'Analyzing...' : 'Generate Insight'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {(Object.entries(groupedEntries) as [string, NoteEntry[]][]).map(([month, monthEntries]) => (
          <div key={month} className="mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b6b55] mb-6 flex items-center gap-3">
              <span className="shrink-0">{month}</span>
              <div className="h-px w-full bg-[#e8e4d9]" />
            </h3>
            
            <div className="space-y-8 relative">
              {/* Timeline Line */}
              <div className="absolute left-[15px] top-4 bottom-4 w-px bg-[#e8e4d9]" />

              {monthEntries.map((entry, idx) => (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative pl-10"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-[#fdfbf7] border border-[#e8e4d9] flex items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-[#0a3610]" />
                  </div>

                  {/* Entry Card */}
                  <div className="bg-white border border-[#e8e4d9] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Main Photo */}
                    {entry.photos.length > 0 && (
                      <div className="aspect-video relative">
                        <NoteImage 
                          entry={entry} 
                          photoIndex={0} 
                          className="w-full h-full object-cover" 
                          onClick={async () => {
                            const { getNotePhoto: getP } = await import('../services/localStorageDB');
                            const count = entry.photos?.length || 0;
                            const photos: string[] = [];
                            for (let i = 0; i < count; i++) {
                              const p = await getP(entry.id, i);
                              if (p) photos.push(p);
                            }
                            setFullScreenPhotos(photos.length > 0 ? photos : (entry.photos?.filter(Boolean) || []));
                            setFullScreenPhotoIndex(0);
                          }}
                        />
                        {entry.photos.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            +{(entry.photos.length || entry.photoCount || 0) - 1} photos
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className="p-5 space-y-4 cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-wider">
                            {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric' })}
                          </span>
                          {entry.weather && (
                            <div className="flex items-center gap-2 bg-[#f4f1e8] border border-[#e8e4d9] rounded-full pl-2 pr-3 py-1.5">
                              {/Sun|Clear/i.test(entry.weather.condition)
                                ? <Sun size={16} className="text-amber-500" />
                                : /Rain|Drizzle|Shower|Thunder/i.test(entry.weather.condition)
                                  ? <CloudRain size={16} className="text-blue-400" />
                                  : <Cloud size={16} className="text-gray-400" />}
                              <span className="text-base font-bold text-[#0a3610] leading-none">{entry.weather.temp}°</span>
                              <span className="text-[11px] text-gray-500 font-medium leading-none">{entry.weather.condition}</span>
                            </div>
                          )}
                        </div>
                        <h4 className="font-serif italic text-xl text-[#0a3610]">{entry.title}</h4>
                      </div>

                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{entry.content}</p>

                      {/* Tags/Milestones */}
                      <div className="flex flex-wrap gap-2">
                        {entry.harvest && (
                          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <ShoppingBag size={10} />
                            {entry.harvest.amount} {entry.harvest.item}
                          </div>
                        )}
                        {entry.phenologyEvents.map((event, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <Leaf size={10} />
                            {event}
                          </div>
                        ))}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${MOODS.find(m => m.label === entry.mood)?.color || 'bg-gray-50 text-gray-600'}`}>
                          {MOODS.find(m => m.label === entry.mood)?.icon}
                          {entry.mood}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        
        {entries.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-[#f4f1e8] rounded-full flex items-center justify-center mx-auto text-[#0a3610]/20">
              <Calendar size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-serif italic text-lg text-[#0a3610]">Your journal is empty</p>
              <p className="text-xs text-gray-500">Record your first entry today.</p>
            </div>
          </div>
        )}
      </div>

      {/* New Note Modal */}
      <AnimatePresence>
        {isAddingEntry && (
          <NewNoteModal 
            onClose={() => setIsAddingEntry(false)}
            onSave={(entry) => {
              onAddEntry(entry);
              setIsAddingEntry(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEntry && (
          <JournalDetailModal
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onSave={(updated) => {
              if (onUpdateEntry) onUpdateEntry(updated);
              setSelectedEntry(null);
            }}
            onDelete={(id) => {
              onDeleteEntry(id);
              setSelectedEntry(null);
            }}
          />
        )}

        {fullScreenPhotos !== null && fullScreenPhotoIndex !== null && (
          <PhotoGallery 
            photos={fullScreenPhotos} 
            initialIndex={fullScreenPhotoIndex} 
            onClose={() => {
              setFullScreenPhotos(null);
              setFullScreenPhotoIndex(null);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export interface NewNoteModalProps {
  onClose: () => void;
  onSave: (entry: NoteEntry) => void;
  initialTitle?: string;
}

export function NewNoteModal({ onClose, onSave, initialTitle = '' }: NewNoteModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [mood, setMood] = useState('Sunny');
  const [harvestAmount, setHarvestAmount] = useState('');
  const [harvestItem, setHarvestItem] = useState('');
  const [phenologyEvent, setPhenologyEvent] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [weather, setWeather] = useState({ temp: 72, condition: 'Sunny' });

  // Simulate weather fetch
  React.useEffect(() => {
    // In a real app, we'd fetch based on geolocation
    const conditions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain'];
    setWeather({
      temp: Math.floor(Math.random() * (85 - 65) + 65),
      condition: conditions[Math.floor(Math.random() * conditions.length)]
    });
  }, []);

  const handleAddEvent = () => {
    if (phenologyEvent.trim()) {
      setEvents([...events, phenologyEvent.trim()]);
      setPhenologyEvent('');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos([...photos, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title || !content) return;

    const newEntry: NoteEntry = {
      id: Math.random().toString(36).substr(2, 9),
      uid: '', // This will be set by App.tsx before saving to Firestore
      date: new Date().toISOString(),
      title,
      content,
      photos,
      mood,
      weather,
      harvest: harvestAmount ? { amount: harvestAmount, item: harvestItem } : undefined,
      phenologyEvents: events,
    };

    onSave(newEntry);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full sm:max-w-lg bg-[#fdfbf7] rounded-t-[40px] sm:rounded-[40px] h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h3 className="font-serif italic text-2xl text-[#0a3610]">Journal Entry</h3>
            <p className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-widest">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-[#f4f1e8] rounded-full flex items-center justify-center text-[#0a3610] active:scale-90 transition-transform"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
          {/* Photos */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-widest">Daily Highlights</label>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <label className="w-24 h-24 rounded-3xl border-2 border-dashed border-[#e8e4d9] flex flex-col items-center justify-center text-[#8b6b55] cursor-pointer hover:bg-[#f4f1e8] transition-colors shrink-0">
                <Camera size={24} />
                <span className="text-[8px] font-bold uppercase mt-1">Add Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              {photos.map((photo, i) => (
                <div key={i} className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 relative group">
                  <img src={photo} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Title & Content */}
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Entry Title (e.g., Morning Loquat Harvest)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent border-none p-0 font-serif italic text-2xl text-[#0a3610] placeholder-[#0a3610]/20 focus:ring-0"
            />
            <textarea 
              placeholder="Write your story here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full bg-transparent border-none p-0 text-sm text-gray-600 placeholder-gray-300 focus:ring-0 resize-none"
            />
          </div>

          {/* Mood Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-widest">Today's Vibe</label>
            <div className="flex gap-3">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setMood(m.label)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${mood === m.label ? 'border-[#0a3610] bg-[#0a3610]/5' : 'border-[#e8e4d9] bg-white'}`}
                >
                  <div className={m.color + " p-2 rounded-full"}>{m.icon}</div>
                  <span className="text-[8px] font-bold uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Harvest & Phenology */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-widest">Harvest Yield</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="3 lbs"
                  value={harvestAmount}
                  onChange={(e) => setHarvestAmount(e.target.value)}
                  className="w-1/2 bg-[#f4f1e8] border-none rounded-xl py-2 px-3 text-xs text-[#0a3610] focus:ring-0"
                />
                <input 
                  type="text" 
                  placeholder="Fruit"
                  value={harvestItem}
                  onChange={(e) => setHarvestItem(e.target.value)}
                  className="w-1/2 bg-[#f4f1e8] border-none rounded-xl py-2 px-3 text-xs text-[#0a3610] focus:ring-0"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#8b6b55] uppercase tracking-widest">Phenology Event</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="First blossom..."
                  value={phenologyEvent}
                  onChange={(e) => setPhenologyEvent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEvent()}
                  className="flex-1 bg-[#f4f1e8] border-none rounded-xl py-2 px-3 text-xs text-[#0a3610] focus:ring-0"
                />
                <button 
                  onClick={handleAddEvent}
                  className="w-8 h-8 bg-[#0a3610] text-white rounded-lg flex items-center justify-center"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {events.map((ev, i) => (
                  <span key={i} className="text-[8px] font-bold bg-[#f4f1e8] text-[#0a3610] px-2 py-1 rounded-full flex items-center gap-1">
                    {ev}
                    <X size={8} onClick={() => setEvents(events.filter((_, idx) => idx !== i))} className="cursor-pointer" />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Weather Snapshot (Display Only) */}
          <div className="bg-[#f4f1e8]/50 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#0a3610]">
                {weather.condition.includes('Sunny') ? <Sun size={20} /> : <Cloud size={20} />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#0a3610]">{weather.condition}</p>
                <p className="text-[10px] text-[#8b6b55]">Local Weather Snapshot</p>
              </div>
            </div>
            <div className="text-2xl font-serif italic text-[#0a3610]">{weather.temp}°</div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 bg-white border-t border-[#e8e4d9] shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={!title || !content}
            className="w-full bg-[#0a3610] text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
          >
            Save Entry
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ─── Journal Detail / Edit Modal ───────────────────────────────────────────────

export function JournalDetailModal({
  entry,
  onClose,
  onSave,
  onDelete,
}: {
  entry: NoteEntry;
  onClose: () => void;
  onSave: (entry: NoteEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [title, setTitle] = useState(entry.title);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosDirty, setPhotosDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getNotePhoto } = await import('../services/localStorageDB');
      const count = entry.photos?.length || entry.photoCount || 0;
      const loaded: string[] = [];
      for (let i = 0; i < count; i++) {
        const p = await getNotePhoto(entry.id, i);
        if (p) loaded.push(p);
      }
      if (!cancelled) setPhotos(loaded);
    })();
    return () => { cancelled = true; };
  }, [entry.id]);

  const handleAddPhotos = async (files: FileList) => {
    const toB64 = (f: File) => new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    const added: string[] = [];
    for (let i = 0; i < files.length; i++) added.push(await toB64(files[i]));
    setPhotos(prev => [...prev, ...added]);
    setPhotosDirty(true);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotosDirty(true);
  };

  const handleSave = async () => {
    const { savePhoto, deletePhotosForId } = await import('../services/localStorageDB');
    if (photosDirty) {
      // Re-save the full photo set fresh to avoid index gaps/orphans
      await deletePhotosForId(`note_${entry.id}`);
      for (let i = 0; i < photos.length; i++) {
        await savePhoto(`note_${entry.id}_${i}`, photos[i]);
      }
    }
    onSave({
      ...entry,
      title: title.trim() || entry.title,
      content,
      photos: photos.map((_, i) => `note_${entry.id}_${i}`),
      photoCount: photos.length,
    });
  };

  const dateStr = new Date(entry.date).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeStr = new Date(entry.date).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-[#fdfbf7] w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#fdfbf7]/95 backdrop-blur-md px-6 pt-6 pb-4 flex justify-between items-center border-b border-[#e8e4d9] z-10">
          <button onClick={onClose} className="text-sm font-bold text-[#0a3610] uppercase tracking-wider">Close</button>
          <div className="flex gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0a3610] bg-[#e8e4d9] px-3 py-1.5 rounded-full hover:bg-[#d8d4c9] transition-colors uppercase tracking-wider"
              >
                <Edit2 size={12} /> Edit
              </button>
            )}
            <button
              onClick={() => onDelete(entry.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors uppercase tracking-wider"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Date + weather */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-[11px] font-bold text-[#8b6b55] uppercase tracking-widest">
              {dateStr} · {timeStr}
            </div>
            {entry.weather && (
              <div className="flex items-center gap-2 bg-[#f4f1e8] border border-[#e8e4d9] rounded-full pl-2.5 pr-4 py-2">
                {/Sun|Clear/i.test(entry.weather.condition)
                  ? <Sun size={20} className="text-amber-500" />
                  : /Rain|Drizzle|Shower|Thunder/i.test(entry.weather.condition)
                    ? <CloudRain size={20} className="text-blue-400" />
                    : <Cloud size={20} className="text-gray-400" />}
                <span className="text-xl font-bold text-[#0a3610] leading-none">{entry.weather.temp}°</span>
                <span className="text-xs text-gray-500 font-medium">{entry.weather.condition}</span>
              </div>
            )}
          </div>

          {/* Title */}
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full font-serif italic text-2xl text-[#0a3610] bg-white border border-[#e8e4d9] rounded-xl px-4 py-2 focus:outline-none focus:border-[#8b6b55]"
            />
          ) : (
            <h3 className="font-serif italic text-3xl text-[#0a3610] leading-tight">{entry.title}</h3>
          )}

          {/* Photos */}
          <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
            {photos.map((src, i) => (
              <div key={i} className="relative w-24 h-24 shrink-0">
                <img src={src} alt="" className="w-full h-full object-cover rounded-2xl" />
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 bg-white rounded-full text-red-600 shadow-sm hover:bg-red-50 p-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#e8e4d9] flex flex-col items-center justify-center text-[#8b6b55] cursor-pointer hover:bg-[#f4f1e8] transition-colors shrink-0">
                <Camera size={18} />
                <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) handleAddPhotos(e.target.files); e.target.value=''; }}
                />
              </label>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[180px] bg-white border border-[#e8e4d9] rounded-2xl px-4 py-3 text-sm text-[#0a3610] leading-relaxed focus:outline-none focus:border-[#8b6b55]"
              placeholder="Drop your thoughts here…"
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {entry.phenologyEvents?.map((ev, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Leaf size={10} /> {ev}
              </div>
            ))}
            {entry.mood && (
              <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {entry.mood}
              </div>
            )}
          </div>

          {/* Save / Cancel when editing */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-2 pb-4">
              <button
                onClick={() => { setContent(entry.content); setTitle(entry.title); setIsEditing(false); }}
                className="px-5 py-2.5 rounded-xl text-[#8b6b55] font-medium hover:bg-[#f4f1e8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-[#0a3610] text-white rounded-xl font-medium hover:bg-[#052e16] transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
