import { motion, AnimatePresence } from 'motion/react';
import { X, Award, MapPin } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickCount: number;
}

export function ProfileModal({ isOpen, onClose, pickCount }: ProfileModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-[#fdfbf7] rounded-[2.5rem] z-[201] shadow-2xl overflow-hidden"
          >
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="font-serif italic text-3xl text-[#0a3610]">My Orchard</h2>
                <button onClick={onClose} className="p-2 bg-[#f4f1e8] rounded-full text-[#0a3610]">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#f4f1e8] rounded-3xl p-6 text-center space-y-1">
                  <p className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Total Picks</p>
                  <p className="text-3xl font-serif italic text-[#0a3610]">{pickCount}</p>
                </div>
                <div className="bg-[#f4f1e8] rounded-3xl p-6 text-center space-y-1">
                  <p className="text-[10px] font-bold text-[#6b4c3a] uppercase tracking-widest">Level</p>
                  <p className="text-3xl font-serif italic text-[#0a3610]">
                    {pickCount < 5 ? 'Seed' : pickCount < 15 ? 'Sprout' : 'Harvester'}
                  </p>
                </div>
              </div>

              <div className="bg-[#0a3610]/5 rounded-3xl p-6 flex items-start gap-4">
                <div className="bg-[#0a3610] p-2 rounded-xl text-white">
                  <MapPin size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#0a3610]">Local-First Forager</p>
                  <p className="text-xs text-[#0a3610]/70 leading-relaxed">
                    All your picks are stored privately on this device. Use Cloud Archive in the menu to back up to Google Drive.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
