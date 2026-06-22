import { GitBranch, Database, FileQuestion, CheckCircle2 } from "lucide-react";
import { useSamplingStore } from "@/store/useSamplingStore";

export default function TopBar() {
  const toggleParamDrawer = useSamplingStore((s) => s.toggleParamDrawer);
  const unstableCount = useSamplingStore((s) => s.unstableRecords.filter((u) => u.status === "pending").length);
  const result = useSamplingStore((s) => s.samplingResult);

  return (
    <header className="bg-slate-deep text-white px-6 py-3 flex items-center justify-between shadow-card sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-jade to-teal-soft flex items-center justify-center">
          <Database size={18} />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold tracking-wide">概率抽样报告讲解</h1>
          <p className="text-xs text-slate-200/70 font-mono">数据分析 · 小孟专属工作台</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-6 text-sm font-mono">
          <div className="flex flex-col items-end">
            <span className="text-slate-200/60 text-[10px] uppercase tracking-wider">样本数</span>
            <span className="font-semibold">{result.sampledCount}/{result.totalCount}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-200/60 text-[10px] uppercase tracking-wider">均值</span>
            <span className="font-semibold text-teal-soft">{result.meanValue.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-200/60 text-[10px] uppercase tracking-wider">抽样率</span>
            <span className="font-semibold">{(result.sampleRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <button
          onClick={() => toggleParamDrawer(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-soft hover:bg-slate-soft/80 transition-colors text-sm font-mono"
        >
          <GitBranch size={15} />
          <span>参数版本</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-warm/90 text-sm font-mono">
          <FileQuestion size={15} />
          <span>待确认 {unstableCount}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-teal-jade/90 text-sm font-mono">
          <CheckCircle2 size={15} />
          <span>材料就绪</span>
        </div>
      </div>
    </header>
  );
}
