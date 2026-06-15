import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BatteryCharging, Info, Sparkles } from "lucide-react";
import { Scene3D } from "@/components/Scene3D/Scene3D";
import { PointDetailPopup } from "@/components/Scene3D/PointDetailPopup";
import { TimelineControl } from "@/components/Timeline/TimelineControl";
import { FilterPanel } from "@/components/FilterPanel/FilterPanel";
import { DetailTable } from "@/components/DetailTable/DetailTable";
import { HistoryDrawer } from "@/components/HistoryDrawer/HistoryDrawer";
import { GuideLayer } from "@/components/GuideLayer/GuideLayer";
import { useAppStore } from "@/store/useAppStore";

export default function Home() {
  const [showTitle, setShowTitle] = useState(true);
  const totalPoints = useAppStore((s) => s.points.length);
  const conflictCount = useAppStore((s) => s.points.filter((p) => p.isConflict).length);
  const duplicateCount = useAppStore((s) => s.points.filter((p) => p.isDuplicate).length);

  return (
    <div className="w-full h-full relative overflow-hidden bg-deepsea-900">
      <div className="absolute inset-0">
        <Scene3D />
      </div>

      <AnimatePresence>
        {showTitle && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div className="glass-panel rounded-2xl px-6 py-3 flex items-center gap-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amberwarm-400 to-amberwarm-600 flex items-center justify-center shadow-glow">
                <BatteryCharging size={22} className="text-white" />
              </div>
              <div>
                <h1 className="font-serif text-xl text-white leading-tight tracking-wide">
                  社区充电投诉回放
                </h1>
                <p className="text-[11px] text-slategray-400 font-mono tracking-wide">
                  GIS点位时空复盘 · 街口冲突预判 · 判断全链路追溯
                </p>
              </div>
              <div className="h-10 w-px bg-deepsea-500/50 mx-1" />
              <div className="flex gap-4 text-xs">
                <div className="text-center">
                  <div className="font-mono text-lg text-white">{totalPoints}</div>
                  <div className="text-slategray-500">投诉点位</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg text-amberwarm-400">{conflictCount}</div>
                  <div className="text-slategray-500">街口冲突</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-lg text-magenta-400">{duplicateCount}</div>
                  <div className="text-slategray-500">重复投诉</div>
                </div>
              </div>
              <button
                onClick={() => setShowTitle(false)}
                className="p-1.5 rounded-lg hover:bg-deepsea-500/40 text-slategray-400 hover:text-white transition-colors pointer-events-auto"
              >
                <Info size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showTitle && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowTitle(true)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-2 glass-panel rounded-full hover:bg-deepsea-500/60 text-slategray-300 hover:text-white transition-all"
        >
          <Sparkles size={18} className="text-amberwarm-400" />
        </motion.button>
      )}

      <FilterPanel />
      <DetailTable />
      <PointDetailPopup />
      <HistoryDrawer />
      <TimelineControl />
      <GuideLayer />

      <div className="absolute bottom-32 left-4 z-10 space-y-1.5 pointer-events-none">
        <div className="glass-panel rounded-lg px-3 py-1.5 text-[11px] text-slategray-400 font-mono">
          <span className="text-amberwarm-300">提示</span> · 鼠标左键旋转 · 右键平移 · 滚轮缩放
        </div>
      </div>
    </div>
  );
}
