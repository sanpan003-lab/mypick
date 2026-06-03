import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TriangleAlert as AlertTriangle, Copy, Check, X } from 'lucide-react';

interface ErrorModalProps {
  error: string | null;
  onClose: () => void;
}

export function ErrorModal({ error, onClose }: ErrorModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(error ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  };

  return (
    <AnimatePresence>
      {error !== null && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[500]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed z-[501] inset-x-4 top-[50%] -translate-y-[50%] sm:inset-x-auto sm:left-[50%] sm:-translate-x-[50%] sm:w-[420px] bg-[#fdfbf7] rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 pt-6 pb-4 flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-800 text-sm">Something went wrong</p>
                <p className="text-[11px] text-red-600 mt-0.5">Copy the error details below to get help.</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error body */}
            <div className="px-6 py-4">
              <code className="block whitespace-pre-wrap break-all text-[12px] font-mono text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3 max-h-48 overflow-y-auto leading-relaxed">
                {error}
              </code>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0a3610] text-white text-sm font-bold transition-all active:scale-95 hover:bg-[#052e16]"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Error Details'}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-2xl bg-[#f4f1e8] text-[#0a3610] text-sm font-bold hover:bg-[#e8e4d9] transition-colors active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
