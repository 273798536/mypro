import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Camera, Clock, FileText, MapPin, Repeat2, X, Edit3 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { RESULT_WORDS, STATUS_COLORS } from "@/types";

export function PointDetailPopup() {
  const selectedPointId = useAppStore((s) => s.selectedPointId);
  const selectedPoint = useAppStore((s) => s.getSelectedPoint());
  const selectPoint = useAppStore((s) => s.selectPoint);
  const toggleHistoryDrawer = useAppStore((s) => s.toggleHistoryDrawer);

  return (
    <AnimatePresence>
      {selectedPointId && selectedPoint && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[420px] max-w-[90vw]"
        >
          <div className="glass-panel-strong rounded-2xl overflow-hidden shadow-2xl">
            <div
              className="h-1.5"
              style={{ background: STATUS_COLORS[selectedPoint.status] }}
            />

            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-deepsea-200">
                      {selectedPoint.id}
                    </span>
                    {selectedPoint.isConflict && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amberwarm-500/20 text-amberwarm-300 text-xs font-medium">
                        <AlertTriangle size={12} />
                        街口冲突
                      </span>
                    )}
                    {selectedPoint.isDuplicate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-magenta-500/20 text-magenta-300 text-xs font-medium">
                        <Repeat2 size={12} />
                        重复投诉
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg text-white leading-snug">
                    {selectedPoint.address}
                  </h3>
                </div>
                <button
                  onClick={() => selectPoint(null)}
                  className="p-1.5 rounded-lg hover:bg-deepsea-500/40 text-slategray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-deepsea-800/60 rounded-xl p-3 border border-deepsea-500/30">
                  <div className="flex items-center gap-1.5 text-xs text-slategray-400 mb-1">
                    <FileText size={12} />
                    来源
                  </div>
                  <div className="text-white font-medium">{selectedPoint.source}</div>
                </div>
                <div className="bg-deepsea-800/60 rounded-xl p-3 border border-deepsea-500/30">
                  <div className="flex items-center gap-1.5 text-xs text-slategray-400 mb-1">
                    <MapPin size={12} />
                    处理状态
                  </div>
                  <div
                    className="font-medium"
                    style={{ color: STATUS_COLORS[selectedPoint.status] }}
                  >
                    {RESULT_WORDS[selectedPoint.status]}
                  </div>
                </div>
                <div className="bg-deepsea-800/60 rounded-xl p-3 border border-deepsea-500/30">
                  <div className="flex items-center gap-1.5 text-xs text-slategray-400 mb-1">
                    <Clock size={12} />
                    投诉次数
                  </div>
                  <div className="text-white font-medium">
                    {selectedPoint.complaintCount} 次
                  </div>
                </div>
                <div className="bg-deepsea-800/60 rounded-xl p-3 border border-deepsea-500/30">
                  <div className="flex items-center gap-1.5 text-xs text-slategray-400 mb-1">
                    <Camera size={12} />
                    现场照片
                  </div>
                  <div className="text-white font-medium">
                    {selectedPoint.photos.length} 张
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-slategray-400 mb-1.5">当前判断</div>
                <div className="bg-amberwarm-500/10 border border-amberwarm-500/30 rounded-xl p-3 text-amberwarm-200 font-serif text-sm leading-relaxed">
                  {selectedPoint.currentJudgment}
                </div>
              </div>

              {selectedPoint.records.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slategray-400 mb-2">最新投诉</div>
                  <div className="bg-deepsea-800/40 rounded-xl p-3 text-sm text-slategray-200 border-l-2 border-deepsea-300">
                    {selectedPoint.records[selectedPoint.records.length - 1].complaintContent}
                    <div className="text-xs text-slategray-500 mt-1">
                      {selectedPoint.records[selectedPoint.records.length - 1].complaintTime}
                    </div>
                  </div>
                </div>
              )}

              {Object.keys(selectedPoint.rawFields).length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-slategray-400 mb-2">GIS扩展字段</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedPoint.rawFields).map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2 py-1 rounded-lg bg-deepsea-700/60 text-xs text-deepsea-100 font-mono"
                      >
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={toggleHistoryDrawer}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-deepsea-500/50 hover:bg-deepsea-400/60 text-white text-sm font-medium transition-colors border border-deepsea-300/20"
                >
                  <Edit3 size={16} />
                  查看判断历史
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
