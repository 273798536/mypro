import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { LearningPoint } from '@/types';

interface LearningReportProps {
  learningPoints: LearningPoint[];
}

export default function LearningReport({ learningPoints }: LearningReportProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-sky-400" />
        学习报告
      </h3>

      <div className="space-y-3">
        {learningPoints.map((point, index) => {
          const isExpanded = expandedId === point.id;

          return (
            <motion.div
              key={point.id}
              className="bg-slate-700/50 rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/70 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : point.id)}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-200">
                    {point.title}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 border-t border-slate-600">
                      <div className="mt-3 text-sm text-slate-300 leading-relaxed">
                        {point.content}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
