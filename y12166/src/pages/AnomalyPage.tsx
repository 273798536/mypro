import { useSimStore } from "../store/simStore";
import AnomalyTrace from "../components/AnomalyTrace";
import { AlertTriangle } from "lucide-react";

export default function AnomalyPage() {
  const result = useSimStore((s) => s.result);

  if (!result) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-slate-200">异常追溯</h1>
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-12 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-slate-700" />
          <p className="text-slate-500 text-sm mt-4">
            请先在仿真总览页运行仿真
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-200">异常追溯</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          从异常事件追溯水循环计算、余氯预测与排程建议，导出一致性报告
        </p>
      </div>
      <AnomalyTrace />
    </div>
  );
}
