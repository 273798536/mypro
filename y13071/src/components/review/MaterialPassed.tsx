import { CheckCircle2, User, FileCheck2 } from "lucide-react";
import { materialItems } from "@/utils/mockData";

export function MaterialPassed() {
  const items = materialItems.filter((m) => m.status === "PASS");
  return (
    <div className="glass rounded-xl border border-pass-500/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-pass-500/20 bg-pass-500/5 flex items-center gap-2">
        <FileCheck2 className="w-4 h-4 text-pass-400" />
        <h3 className="font-display text-[15px] text-pass-400">可放行材料</h3>
        <span className="ml-auto px-2 py-0.5 rounded bg-pass-500/20 text-pass-400 text-[11px] font-mono">
          {items.length} 项
        </span>
      </div>
      <div className="divide-y divide-mine-700/40">
        {items.map((m, i) => (
          <div key={m.id} className="p-4 hover:bg-pass-500/5 transition">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-6 h-6 rounded-full bg-pass-500/15 border border-pass-500/40 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-pass-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-pass-400 font-mono">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="text-[13px] text-silver-200 font-mono">
                    {m.title}
                  </div>
                </div>
                <div className="text-[12px] text-silver-400 mt-1.5 leading-relaxed font-mono">
                  {m.reason}
                </div>
                <div className="flex items-center gap-1 mt-2 text-[11px] text-silver-400 font-mono">
                  <User className="w-3 h-3" />
                  确认人：{m.owner}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
