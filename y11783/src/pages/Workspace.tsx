import { useEffect } from "react";
import { usePartitionStore } from "@/store";
import ConfigPanel from "@/components/ConfigPanel";
import RecursionTree from "@/components/RecursionTree";
import ResultTable from "@/components/ResultTable";
import WarningBanner from "@/components/WarningBanner";
import ImportPanel from "@/components/ImportPanel";
import ExportPanel from "@/components/ExportPanel";
import CorrectionTimeline from "@/components/CorrectionTimeline";
import { Link } from "react-router-dom";
import { History } from "lucide-react";

export default function Workspace() {
  const loadSessions = usePartitionStore((s) => s.loadSessions);
  const currentResult = usePartitionStore((s) => s.currentResult);
  const config = usePartitionStore((s) => s.config);
  const warnings = usePartitionStore((s) => s.warnings);
  const explosionAcknowledged = usePartitionStore(
    (s) => s.explosionAcknowledged
  );
  const hasExplosion = warnings.some((w) => w.type === "explosion");

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const blockedByExplosion = hasExplosion && !explosionAcknowledged;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-amber-400" style={{ fontFamily: "'LXGW WenKai', cursive" }}>
            整数拆分讲解器
          </h1>
          <span className="text-xs text-slate-500">奥数教学工具</span>
        </div>
        <Link
          to="/history"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 transition-colors"
        >
          <History size={16} />
          历史记录
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 border-r border-slate-800/60 overflow-y-auto bg-slate-900/40">
          <ConfigPanel />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <WarningBanner />

          {blockedByExplosion ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">⚠️</div>
                <p className="text-xl text-red-400 font-bold">
                  方案数量爆炸
                </p>
                <p className="text-slate-400 max-w-md">
                  当前条件下方案数过多，请缩小加数范围或增加限制条件，或在上方警告栏点击"确认继续"
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6" id="export-area">
              <div className="bg-slate-900/60 rounded-xl border border-slate-800/60 p-1 mb-2">
                <div className="px-4 py-2 flex items-center justify-between">
                  <h2
                    className="text-sm font-semibold text-amber-400/80"
                    style={{ fontFamily: "'LXGW WenKai', cursive" }}
                  >
                    递归生成过程
                  </h2>
                  <span className="text-xs text-slate-500">
                    目标：{config.targetNumber} | 模式：
                    {config.mode === "ordered" ? "有序" : "无序"}
                  </span>
                </div>
                <RecursionTree />
              </div>

              <div className="bg-slate-900/60 rounded-xl border border-slate-800/60 p-1">
                <div className="px-4 py-2 flex items-center justify-between">
                  <h2
                    className="text-sm font-semibold text-amber-400/80"
                    style={{ fontFamily: "'LXGW WenKai', cursive" }}
                  >
                    拆分方案
                  </h2>
                  <ExportPanel />
                </div>
                <ResultTable />
              </div>

              {currentResult?.importMeta && (
                <div className="text-xs text-slate-500 px-2">
                  来源：{currentResult.importMeta.filename} | 策略：
                  {currentResult.importMeta.strategy === "ignore"
                    ? "忽略"
                    : currentResult.importMeta.strategy === "overwrite"
                    ? "覆盖"
                    : "追加"}
                  | 导入字段：
                  {currentResult.importMeta.fieldsImported.join(", ") || "无"}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <CorrectionTimeline />
      <ImportPanel />
    </div>
  );
}
