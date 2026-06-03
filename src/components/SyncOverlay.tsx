import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, Smartphone, Leaf, Check, AlertCircle } from 'lucide-react';

export type SyncStatus = 'syncing' | 'success' | 'error';

interface SyncOverlayProps {
  status: SyncStatus;
  progress: number; // 0 to 100
  currentCount: number;
  totalCount: number;
  onDismiss: () => void;
  errorMessage?: string;
}

export function SyncOverlay({ status, progress, currentCount, totalCount, onDismiss, errorMessage }: SyncOverlayProps) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-[#0a3610]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
    >
      {/* Central Visual */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-8">
        {/* Progress Circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="96"
            cy="96"
            r={radius}
            stroke={status === 'error' ? '#ef4444' : '#ffffff'}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ type: "spring", damping: 20, stiffness: 50 }}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Animation */}
        <div className="relative z-10 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {status === 'syncing' && (
              <motion.div
                key="syncing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative"
              >
                {/* Floating Leaves */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-full h-24 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 40, x: (i - 2) * 15, opacity: 0, scale: 0.5 }}
                      animate={{ 
                        y: -40, 
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                        rotate: [0, 180]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        delay: i * 0.4,
                        ease: "easeInOut"
                      }}
                      className="absolute text-white/40"
                    >
                      <Leaf size={16} />
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-white"
                >
                  <Smartphone size={48} strokeWidth={1.5} />
                </motion.div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 text-white"
                >
                  <Cloud size={32} />
                </motion.div>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#0a3610] shadow-[0_0_30px_rgba(255,255,255,0.4)]"
              >
                <Check size={40} strokeWidth={3} />
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-500"
              >
                <AlertCircle size={64} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status Text */}
      <div className="space-y-4 max-w-xs">
        <AnimatePresence mode="wait">
          {status === 'syncing' ? (
            <motion.div
              key="text-syncing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h2 className="font-serif italic text-3xl text-white mb-2">Moving Your Orchard</h2>
              <p className="text-white/60 text-sm font-medium uppercase tracking-widest">
                Syncing Pick {currentCount} of {totalCount}
              </p>
            </motion.div>
          ) : status === 'success' ? (
            <motion.div
              key="text-success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-serif italic text-4xl text-white mb-3">Success!</h2>
              <p className="text-white/80 text-sm leading-relaxed">
                All {totalCount} of your picks are now safe in the cloud! You can access them from any device.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="text-error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="font-serif italic text-3xl text-white mb-2">Sync Interrupted</h2>
              <p className="text-red-300 text-sm">
                {errorMessage || "Something went wrong. Please check your connection and try again."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Button */}
      {(status === 'success' || status === 'error') && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onDismiss}
          className={`mt-12 px-12 py-4 rounded-full font-bold uppercase tracking-widest transition-all active:scale-95 ${
            status === 'success' 
              ? 'bg-white text-[#0a3610] shadow-xl' 
              : 'bg-red-500 text-white shadow-lg'
          }`}
        >
          {status === 'success' ? 'Got It!' : 'Try Again Later'}
        </motion.button>
      )}
    </motion.div>
  );
}
