import { motion } from "motion/react";
import { Leaf } from "lucide-react";

export function LoadingLeaf({ message = "Analyzing..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <motion.div
        className="bg-[#e8e4d9] p-6 rounded-full border border-[#d1cbb8]"
        animate={{ 
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <Leaf size={48} className="text-[#0a3610]" />
      </motion.div>
      <motion.p 
        className="text-[#0a3610] font-serif italic text-2xl"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  );
}
