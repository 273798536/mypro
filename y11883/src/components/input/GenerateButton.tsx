import { motion } from 'framer-motion';
import { Play, Loader2 } from 'lucide-react';
import { usePartitionStore } from '../../store/usePartitionStore';

export function GenerateButton() {
  const { generateAll, isGenerating, progress, rawInput } = usePartitionStore();
  
  const hasInput = rawInput.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="mt-4"
    >
      <button
        onClick={generateAll}
        disabled={isGenerating || !hasInput}
        className={`w-full btn-primary text-lg flex items-center justify-center gap-3 ${
          isGenerating || !hasInput ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            生成中... {Math.round(progress)}%
          </>
        ) : (
          <>
            <Play className="w-6 h-6" />
            开始生成拆分方案
          </>
        )}
      </button>

      {isGenerating && (
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}
