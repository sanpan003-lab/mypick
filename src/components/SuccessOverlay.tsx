import { motion } from 'motion/react';
import { Leaf } from 'lucide-react';

export function SuccessOverlay() {
  return (
    <div className="absolute inset-0 z-[60] bg-[#fdfbf7]/90 backdrop-blur-sm flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: -50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
        className="bg-[#0a3610] text-white p-6 rounded-full mb-6 shadow-[0_10px_30px_rgba(10,54,16,0.3)]"
      >
        <Leaf size={48} />
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 15 }}
        className="font-serif italic text-4xl text-[#0a3610]"
      >
        Location Saved!
      </motion.h2>
    </div>
  );
}
