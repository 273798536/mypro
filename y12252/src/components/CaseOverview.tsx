import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export default function CaseOverview() {
  const theoremTitle = useGameStore((s) => s.theoremTitle);
  const theoremStatement = useGameStore((s) => s.theoremStatement);
  const studentProof = useGameStore((s) => s.studentProof);
  const [proofOpen, setProofOpen] = useState(false);

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-amber-700/60 overflow-hidden',
        'bg-gradient-to-b from-[#2a1a0e] to-[#1a0f06]'
      )}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 px-4 py-2.5">
        <ScrollText className="h-5 w-5 text-amber-200" />
        <h2
          className="text-lg font-bold text-amber-100 tracking-wide"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          案件卷宗
        </h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3
            className="text-amber-400 text-sm font-semibold mb-1 uppercase tracking-widest"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            案件标题
          </h3>
          <p className="text-amber-100 text-base font-semibold">{theoremTitle}</p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />

        <div>
          <h3
            className="text-amber-400 text-sm font-semibold mb-1 uppercase tracking-widest"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            定理陈述
          </h3>
          <p
            className="text-amber-50/90 text-sm leading-relaxed"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {theoremStatement}
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-amber-700/50 to-transparent" />

        <div>
          <button
            onClick={() => setProofOpen(!proofOpen)}
            className={cn(
              'flex items-center gap-2 w-full text-left',
              'text-amber-400 hover:text-amber-300 transition-colors'
            )}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              学生证明
            </h3>
            {proofOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence>
            {proofOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  className={cn(
                    'mt-2 p-3 rounded border border-amber-800/40',
                    'bg-[#1a0f06]/80 max-h-60 overflow-y-auto',
                    'scrollbar-thin scrollbar-thumb-amber-800 scrollbar-track-transparent'
                  )}
                >
                  <pre
                    className="text-amber-50/85 text-xs leading-relaxed whitespace-pre-wrap"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {studentProof}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-600/30 via-amber-800/10 to-amber-600/30" />
    </div>
  );
}
