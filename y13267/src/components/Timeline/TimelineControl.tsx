import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, SkipBack, SkipForward, Clock } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function TimelineControl() {
  const phases = useAppStore((s) => s.timelinePhases);
  const currentIndex = useAppStore((s) => s.currentPhaseIndex);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const setPhaseIndex = useAppStore((s) => s.setPhaseIndex);
  const togglePlaying = useAppStore((s) => s.togglePlaying);
  const setPlaying = useAppStore((s) => s.setPlaying);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        const next = (currentIndex + 1) % phases.length;
        setPhaseIndex(next);
      }, 2500);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, currentIndex, phases.length, setPhaseIndex]);

  const currentPhase = phases[currentIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-4xl"
      >
        <div className="glass-panel-strong rounded-2xl px-6 py-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amberwarm-400" />
              <span className="text-xs text-slategray-400 uppercase tracking-wider">
                投诉时间轴回放
              </span>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                key={currentPhase.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-right"
              >
                <div className="text-amberwarm-300 font-serif text-lg text-shadow-glow">
                  {currentPhase.label}
                </div>
                <div className="text-xs text-slategray-400">
                  2026-{currentPhase.date} · {currentPhase.description}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="relative mb-3">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-deepsea-700 -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-deepsea-400 to-amberwarm-500 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{ width: `${(currentIndex / (phases.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {phases.map((phase, idx) => {
                const isActive = idx <= currentIndex;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={phase.key}
                    onClick={() => {
                      setPlaying(false);
                      setPhaseIndex(idx);
                    }}
                    className="group relative flex flex-col items-center"
                  >
                    <motion.div
                      animate={{
                        scale: isCurrent ? 1.3 : 1,
                        backgroundColor: isActive ? "#FF8C42" : "#334155",
                        boxShadow: isCurrent
                          ? "0 0 16px rgba(255,140,66,0.8)"
                          : isActive
                            ? "0 0 8px rgba(255,140,66,0.4)"
                            : "none",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="w-4 h-4 rounded-full border-2 border-deepsea-800 z-10"
                    />
                    <span
                      className={`absolute top-6 text-[10px] font-mono whitespace-nowrap transition-colors ${
                        isActive ? "text-amberwarm-300" : "text-slategray-500"
                      }`}
                    >
                      {phase.date}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setPlaying(false);
                setPhaseIndex(Math.max(0, currentIndex - 1));
              }}
              className="p-2 rounded-xl hover:bg-deepsea-500/40 text-slategray-300 hover:text-white transition-colors"
              disabled={currentIndex === 0}
            >
              <SkipBack size={18} />
            </button>
            <motion.button
              onClick={togglePlaying}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-full bg-gradient-to-br from-amberwarm-400 to-amberwarm-600 text-white shadow-glow"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </motion.button>
            <button
              onClick={() => {
                setPlaying(false);
                setPhaseIndex(Math.min(phases.length - 1, currentIndex + 1));
              }}
              className="p-2 rounded-xl hover:bg-deepsea-500/40 text-slategray-300 hover:text-white transition-colors"
              disabled={currentIndex === phases.length - 1}
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
