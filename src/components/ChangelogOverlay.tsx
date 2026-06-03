import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Sparkles, CircleCheck as CheckCircle2, Zap, Shield } from 'lucide-react';

interface ChangelogOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogOverlay({ isOpen, onClose }: ChangelogOverlayProps) {
  const changes = [
    {
      date: "May 30, 2026",
      items: [
        { icon: <Zap size={16} className="text-amber-500" />, text: "Google Drive backup folder renamed to 'My Pick' — backups now save and restore from a clearly named folder in your Drive." },
        { icon: <Shield size={16} className="text-amber-600" />, text: "Added popup-blocked detection for Google Drive sign-in: if your browser blocks the auth window, an inline amber banner now appears with step-by-step instructions to allow popups." },
        { icon: <CheckCircle2 size={16} className="text-green-500" />, text: "Fixed Google Drive origin mismatch (Error 400) by correctly authorising the app's preview origin in Google Cloud Console." },
        { icon: <Sparkles size={16} className="text-blue-500" />, text: "Added Features guide to the sidebar so new users can quickly understand each section of the app." },
        { icon: <Sparkles size={16} className="text-blue-500" />, text: "Install App option now always visible in the sidebar (when supported by the browser) for quick home-screen installation." },
      ],
    },
    {
      date: "April 1, 2026",
      items: [
        { icon: <Zap size={16} className="text-amber-500" />, text: "Implemented immersive full-screen photo gallery with beautiful white vignetting effect for both tree profiles and journal entries." },
        { icon: <Sparkles size={16} className="text-blue-500" />, text: "Enhanced camera functionality to allow taking multiple photos directly when saving a new location." },
        { icon: <CheckCircle2 size={16} className="text-green-500" />, text: "Resolved 'failed to create backup' error, ensuring reliable data export and restoration." },
      ],
    },
    {
      date: "March 29, 2026",
      items: [
        { icon: <Zap size={16} className="text-amber-500" />, text: "Added Changelog to the sidebar menu to keep you updated on new features." },
        { icon: <Sparkles size={16} className="text-blue-500" />, text: "Fixed Bottom Navigation overlapping the camera shutter button for a better photography experience." },
        { icon: <CheckCircle2 size={16} className="text-green-500" />, text: "Improved Camera Scanner UI with full-screen focus and better stacking." },
        { icon: <CheckCircle2 size={16} className="text-green-500" />, text: "Enhanced UI transitions and loading states for a smoother feel." },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#fdfbf7] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-8 bg-[#0a3610] text-white relative">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles size={24} />
                </div>
                <h2 className="font-serif italic text-3xl">What's New</h2>
              </div>
              <p className="text-white/60 text-sm">Latest updates and improvements</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {changes.map((group, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-2 text-[#6b4c3a]/40">
                    <Calendar size={14} />
                    <span className="text-[10px] uppercase tracking-widest font-bold">{group.date}</span>
                  </div>

                  <div className="space-y-4">
                    {group.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex gap-4">
                        <div className="mt-1 shrink-0">{item.icon}</div>
                        <p className="text-sm text-[#6b4c3a] leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 bg-[#f5f2ed] border-t border-[#e8e4d9] flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-[#0a3610] text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
