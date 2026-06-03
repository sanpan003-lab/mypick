import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Map as MapIcon, Bell, ChevronRight, Smartphone, History, Download, Upload,
  CloudUpload, CloudDownload, Leaf, CircleCheck as CheckCircle2, Loader, Archive,
  ShieldAlert, BookOpen, Camera, StickyNote, Search, Globe, HardDriveDownload,
} from 'lucide-react';
import { MapStyle } from './PickMap';
import { PopupBlockedError } from '../services/googleDriveBackup';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pickCount: number;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onChangelogClick: () => void;
  onInstall?: () => void;
  onLocalBackup: () => void;
  onLocalRestore: (file: File) => void;
  onDriveBackup: () => Promise<void>;
  onDriveRestore: () => Promise<void>;
  isSyncing: boolean;
  syncProgress: number;
  syncLabel: string;
  syncDone: { treeCount: number; noteCount: number } | null;
  onDismissSyncDone: () => void;
}

const FEATURES = [
  {
    icon: <MapIcon size={15} className="text-[#0a3610]" />,
    title: 'Pick Map',
    desc: 'Drop a pin on any fruit tree or foraging spot you discover. Tap a pin to view photos, species info, and notes.',
  },
  {
    icon: <Camera size={15} className="text-[#0a3610]" />,
    title: 'Camera Scanner',
    desc: 'Capture photos and videos of trees or foraging spots directly from the app to attach to your saved locations.',
  },
  {
    icon: <Search size={15} className="text-[#0a3610]" />,
    title: 'Search & Explore',
    desc: 'Browse the botanical database to learn about hundreds of edible plants, trees, and forageables.',
  },
  {
    icon: <StickyNote size={15} className="text-[#0a3610]" />,
    title: 'My Notes',
    desc: 'Keep a foraging journal — log harvest dates, seasonal observations, and personal notes for each tree.',
  },
  {
    icon: <BookOpen size={15} className="text-[#0a3610]" />,
    title: 'Tree Profiles',
    desc: 'Each saved location gets a full profile: species name, edibility guide, photo gallery, and your notes.',
  },
  {
    icon: <Globe size={15} className="text-[#0a3610]" />,
    title: 'Community Pins',
    desc: 'See picks shared by the community on the map. Share your own finds to help fellow foragers.',
  },
  {
    icon: <HardDriveDownload size={15} className="text-[#0a3610]" />,
    title: 'Backup & Restore',
    desc: 'Save everything to Google Drive or export a local JSON file. Restore on any device with one tap.',
  },
];

export function Sidebar({
  isOpen,
  onClose,
  pickCount,
  mapStyle,
  onMapStyleChange,
  notificationsEnabled,
  onToggleNotifications,
  onChangelogClick,
  onInstall,
  onLocalBackup,
  onLocalRestore,
  onDriveBackup,
  onDriveRestore,
  isSyncing,
  syncProgress,
  syncLabel,
  syncDone,
  onDismissSyncDone,
}: SidebarProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [driveExpanded, setDriveExpanded] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const handleDriveBackup = async () => {
    setPopupBlocked(false);
    try {
      await onDriveBackup();
    } catch (err) {
      if (err instanceof PopupBlockedError) setPopupBlocked(true);
    }
  };

  const handleDriveRestore = async () => {
    setPopupBlocked(false);
    try {
      await onDriveRestore();
    } catch (err) {
      if (err instanceof PopupBlockedError) setPopupBlocked(true);
    }
  };

  const cycleMapStyle = () => {
    const styles: MapStyle[] = ['standard', 'satellite', 'terrain'];
    onMapStyleChange(styles[(styles.indexOf(mapStyle) + 1) % styles.length]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
          />

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[300px] bg-[#fdfbf7] z-[201] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 bg-[#0a3610] text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Leaf size={120} />
              </div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-serif italic text-2xl">My Pick</h3>
                  <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">
                    {pickCount} tree{pickCount !== 1 ? 's' : ''} mapped locally
                  </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* ── Install App ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-[#6b4c3a]/60 font-bold px-2">
                  Install
                </p>
                {onInstall ? (
                  <button
                    onClick={onInstall}
                    className="w-full flex items-center justify-between p-4 bg-[#0a3610] text-white rounded-2xl transition-colors hover:bg-[#052e16] active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone size={18} />
                      <div className="text-left">
                        <p className="text-sm font-bold">Install App</p>
                        <p className="text-[10px] opacity-60 mt-0.5">Add to home screen</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-[#0a3610]/5 rounded-2xl border border-[#0a3610]/10">
                    <Smartphone size={18} className="text-[#0a3610]/40 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#6b4c3a]">Install App</p>
                      <p className="text-[10px] text-[#6b4c3a]/60 mt-0.5 leading-relaxed">
                        Open in your browser and tap <span className="font-bold">Add to Home Screen</span> to install.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Features Guide ───────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-[#6b4c3a]/60 font-bold px-2">
                  Features
                </p>
                <div className="rounded-2xl border border-[#0a3610]/20 overflow-hidden bg-[#0a3610]/5">
                  <button
                    onClick={() => setFeaturesExpanded(v => !v)}
                    className="w-full flex items-center justify-between p-4 text-[#0a3610]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0a3610] text-white rounded-xl">
                        <BookOpen size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">App Guide</p>
                        <p className="text-[10px] text-[#6b4c3a] mt-0.5">What each section does</p>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`text-[#0a3610]/40 transition-transform ${featuresExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {featuresExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#0a3610]/10 divide-y divide-[#0a3610]/5">
                          {FEATURES.map((f) => (
                            <div key={f.title} className="px-4 py-3 flex gap-3">
                              <div className="mt-0.5 shrink-0 p-1.5 bg-[#0a3610]/8 rounded-lg">
                                {f.icon}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#0a3610]">{f.title}</p>
                                <p className="text-[10px] text-[#6b4c3a] leading-relaxed mt-0.5">{f.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Cloud Archive & Recovery ─────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-[#6b4c3a]/60 font-bold px-2">
                  Cloud Archive & Recovery
                </p>

                <div className="rounded-2xl border border-[#0a3610]/20 overflow-hidden bg-[#0a3610]/5">
                  <button
                    onClick={() => setDriveExpanded(v => !v)}
                    className="w-full flex items-center justify-between p-4 text-[#0a3610]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0a3610] text-white rounded-xl">
                        <Archive size={16} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Google Drive Sync</p>
                        <p className="text-[10px] text-[#6b4c3a] mt-0.5">Archive & restore your orchard</p>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`text-[#0a3610]/40 transition-transform ${driveExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {driveExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-[#0a3610]/10 pt-3">
                          <p className="text-[10px] text-[#6b4c3a] leading-relaxed">
                            Bundles all your tree data into a single JSON snapshot saved to the{' '}
                            <span className="font-bold text-[#0a3610]">My Pick</span> folder on your Google Drive.
                          </p>

                          {isSyncing && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[#0a3610] text-xs font-medium">
                                <Loader size={14} className="animate-spin" />
                                {syncLabel || 'Working...'}
                              </div>
                              <div className="h-1.5 bg-[#0a3610]/10 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-[#0a3610] rounded-full"
                                  animate={{ width: `${syncProgress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            </div>
                          )}

                          {syncDone && !isSyncing && (
                            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-green-800">
                                  {syncDone.treeCount} trees archived
                                </p>
                                <p className="text-[10px] text-green-700">Saved to Google Drive successfully.</p>
                              </div>
                              <button onClick={onDismissSyncDone} className="text-green-500 hover:text-green-700">
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          {popupBlocked && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
                              <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-amber-800">Popup blocked</p>
                                <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                                  Your browser blocked the Google sign-in window. Tap the
                                  popup-blocked icon in your address bar and select <strong>Always allow</strong>,
                                  then try again.
                                </p>
                              </div>
                              <button onClick={() => setPopupBlocked(false)} className="text-amber-500 hover:text-amber-700 shrink-0">
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleDriveBackup}
                              disabled={isSyncing}
                              className="flex items-center justify-center gap-2 py-3 px-3 bg-[#0a3610] text-white rounded-xl text-xs font-bold hover:bg-[#052e16] transition-colors active:scale-95 disabled:opacity-50"
                            >
                              <CloudUpload size={14} />
                              Backup
                            </button>
                            <button
                              onClick={handleDriveRestore}
                              disabled={isSyncing}
                              className="flex items-center justify-center gap-2 py-3 px-3 border-2 border-[#0a3610] text-[#0a3610] rounded-xl text-xs font-bold hover:bg-[#0a3610]/5 transition-colors active:scale-95 disabled:opacity-50"
                            >
                              <CloudDownload size={14} />
                              Restore
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Local Backup & Restore ───────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-[#6b4c3a]/60 font-bold px-2">
                  Local Backup
                </p>
                <div className="space-y-1">
                  <button
                    onClick={onLocalBackup}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f5f2ed] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-[#6b4c3a]">
                      <Download size={18} />
                      <span className="text-sm font-medium">Export JSON Backup</span>
                    </div>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f5f2ed] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-[#6b4c3a]">
                      <Upload size={18} />
                      <span className="text-sm font-medium">Import JSON Backup</span>
                    </div>
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        onLocalRestore(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* ── App Settings ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-[#6b4c3a]/60 font-bold px-2">
                  App Settings
                </p>
                <div className="space-y-1">
                  <button
                    onClick={cycleMapStyle}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f5f2ed] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-[#6b4c3a]">
                      <MapIcon size={18} />
                      <span className="text-sm font-medium">Map Style</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#0a3610] bg-[#0a3610]/5 px-2 py-1 rounded-full capitalize">
                      {mapStyle}
                    </span>
                  </button>

                  <button
                    onClick={onToggleNotifications}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f5f2ed] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-[#6b4c3a]">
                      <Bell size={18} />
                      <span className="text-sm font-medium">Notifications</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-[#0a3610]' : 'bg-[#e8e4d9]'}`}>
                      <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${notificationsEnabled ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>

                  <button
                    onClick={onChangelogClick}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#f5f2ed] rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 text-[#6b4c3a]">
                      <History size={18} />
                      <span className="text-sm font-medium">Changelog</span>
                      <span className="text-[8px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">New</span>
                    </div>
                    <ChevronRight size={14} className="text-[#6b4c3a]/40" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
