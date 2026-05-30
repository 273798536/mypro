import FractalCanvas from "@/components/FractalCanvas";
import ParameterPanel from "@/components/ParameterPanel";
import DimensionMetrics from "@/components/DimensionMetrics";
import ValidationStatusBar from "@/components/ValidationStatusBar";
import SampleLibrary from "@/components/SampleLibrary";
import ConflictPanel from "@/components/ConflictPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import ReportExport from "@/components/ReportExport";
import { useFractalStore } from "@/store/useFractalStore";
import { Clock, FlaskConical, RotateCcw } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { points, bounds, isGenerating, showConflictPanel, showAuditPanel, setShowAuditPanel, resetToDefault } = useFractalStore();
  const [activeTab, setActiveTab] = useState<"params" | "samples">("params");

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-mono text-sm font-bold shadow-lg shadow-emerald-500/20">
            F
          </div>
          <div>
            <h1 className="text-sm font-mono font-bold tracking-tight text-slate-100">分形图案课堂生成器</h1>
            <p className="text-[10px] text-slate-500">调规则 · 看维度 · 读报告</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ValidationStatusBar />
          <button
            onClick={() => setShowAuditPanel(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-800/70 text-slate-400 border border-slate-700/50 rounded-lg hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Clock size={12} /> 留痕
          </button>
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs px-2 py-2 bg-slate-800/70 text-slate-500 border border-slate-700/50 rounded-lg hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title="重置"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 p-4">
          <div className="flex-1 min-h-0">
            <FractalCanvas points={points} bounds={bounds} isGenerating={isGenerating} />
          </div>
          <div className="mt-3 flex items-center gap-3 shrink-0">
            <DimensionMetrics />
            <div className="flex-1" />
            <ReportExport />
          </div>
        </main>

        <aside className="w-[340px] border-l border-slate-800/80 bg-slate-950/80 flex flex-col shrink-0">
          <div className="flex border-b border-slate-800/80">
            <button
              onClick={() => setActiveTab("params")}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === "params"
                  ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              参数面板
            </button>
            <button
              onClick={() => setActiveTab("samples")}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === "samples"
                  ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FlaskConical size={12} /> 样例导入
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === "params" ? <ParameterPanel /> : <SampleLibrary />}
          </div>
        </aside>
      </div>

      {showConflictPanel && <ConflictPanel />}
      {showAuditPanel && <AuditLogPanel />}
    </div>
  );
}
