import { useSimStore, generateTerminalSummary } from "../store/simStore";

export default function TerminalSummary() {
  const result = useSimStore((s) => s.result);
  if (!result) return null;

  const summary = generateTerminalSummary(result);

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">
        终端摘要（与导出文件一致）
      </h3>
      <pre className="text-[11px] font-mono text-slate-400 bg-slate-950/80 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {summary}
      </pre>
    </div>
  );
}
