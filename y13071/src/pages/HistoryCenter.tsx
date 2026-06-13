import { Link } from "react-router-dom";
import { ArrowLeft, Mountain } from "lucide-react";
import { SnapshotGrid } from "@/components/history/SnapshotGrid";
import { HistoryTimeline } from "@/components/history/HistoryTimeline";

export default function HistoryCenter() {
  return (
    <div className="min-h-screen bg-mine-950 scan-bg">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-9 h-9 rounded-lg glass border border-mine-700/60 flex items-center justify-center text-silver-300 hover:text-cable-300 hover:border-cable-500/40 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-cable-500/20 flex items-center justify-center shadow-glow-cable">
                  <Mountain className="w-5 h-5 text-cable-400" />
                </div>
                <h1 className="font-display text-[20px] text-silver-200 tracking-wide">
                  视图与历史中心
                </h1>
              </div>
              <div className="text-[11px] text-silver-400 font-mono mt-1 ml-10">
                SNAPSHOTS &amp; CHANGE HISTORY — 评审复盘追踪
              </div>
            </div>
          </div>
          <div className="text-[11px] text-silver-400 font-mono">
            点击视图快照可一键恢复：相机视角 + 筛选条件 + 回放时间 + 选中对象
          </div>
        </div>

        <SnapshotGrid />
        <HistoryTimeline />
      </div>
    </div>
  );
}
