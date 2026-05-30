import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight, User, Clock, Hexagon } from 'lucide-react';
import type { CounterexampleTrack } from '@/types/report';

interface CounterexampleTrackProps {
  tracks: CounterexampleTrack[];
}

export default function CounterexampleTrack({ tracks }: CounterexampleTrackProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (tracks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-card p-8 border-2 border-neutral-ivory text-center"
      >
        <Hexagon className="w-12 h-12 text-neutral-slate/30 mx-auto mb-3" />
        <p className="text-neutral-slate">暂无反例追踪记录</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl shadow-card border-2 border-neutral-ivory overflow-hidden"
    >
      <div className="p-6 border-b-2 border-neutral-ivory">
        <h3 className="text-lg font-bold text-neutral-ink">反例追踪表</h3>
        <p className="text-sm text-neutral-slate mt-1">对比补录反例前后的结论变化</p>
      </div>

      <div className="divide-y divide-neutral-ivory">
        {tracks.map((track, idx) => {
          const isExpanded = expandedId === track.counterexampleId;

          return (
            <motion.div
              key={track.counterexampleId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.1 }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : track.counterexampleId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-ivory/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center">
                    <Hexagon className="w-5 h-5 text-accent-violet" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-neutral-ink">{track.content}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-neutral-slate flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        补录时间：{new Date().toLocaleDateString('zh-CN')}
                      </span>
                      <span className="text-xs text-neutral-slate flex items-center gap-1">
                        <User className="w-3 h-3" />
                        补录人：系统自动
                      </span>
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-neutral-slate" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5">
                      <div className="bg-neutral-ivory/50 rounded-xl p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="text-xs text-neutral-slate mb-2 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-accent-rose" />
                              补录前结论
                            </div>
                            <p className="text-accent-rose font-serif line-through decoration-2">
                              {track.beforeConclusion}
                            </p>
                          </div>

                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <ArrowRight className="w-6 h-6 text-neutral-slate" />
                          </motion.div>

                          <div className="flex-1">
                            <div className="text-xs text-neutral-slate mb-2 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-accent-emerald" />
                              补录后结论
                            </div>
                            <p className="text-accent-emerald font-serif bg-accent-emerald/10 px-3 py-2 rounded-lg">
                              {track.afterConclusion}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-neutral-ivory">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-slate">受影响步骤：</span>
                            <div className="flex flex-wrap gap-2">
                              {track.affectedSteps.map((step, sIdx) => (
                                <motion.span
                                  key={step}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.1 + sIdx * 0.05 }}
                                  className="px-2 py-0.5 rounded-full bg-accent-violet/10 text-accent-violet text-xs font-medium"
                                >
                                  步骤 {step}
                                </motion.span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
