import { useStore } from "@/store";
import { Clock, Tag, FileText } from "lucide-react";

const typeColors: Record<string, string> = {
  annotation: "bg-blue-500/20 text-blue-400",
  authorization: "bg-amber/20 text-amber",
  override: "bg-purple-500/20 text-purple-400",
};

const typeLabels: Record<string, string> = {
  annotation: "批注",
  authorization: "授权",
  override: "覆盖",
};

export default function ChangeHistory() {
  const { changeRecords } = useStore();

  const sorted = [...changeRecords].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-surface-800 rounded-lg border border-surface-600">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center gap-2">
        <Clock className="w-4 h-4 text-zinc-400" />
        <h3 className="font-mono text-sm font-semibold text-zinc-100">变更历史</h3>
        <span className="text-xs text-zinc-500 ml-auto">{sorted.length} 条记录</span>
      </div>

      <div className="px-4 py-4">
        {sorted.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm py-8">暂无变更记录</p>
        ) : (
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-surface-600" />
            <div className="space-y-4">
              {sorted.map((record, i) => (
                <div key={record.id} className="relative pl-8">
                  <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-surface-800 ${
                    record.type === "authorization" ? "bg-amber" : record.type === "override" ? "bg-purple-400" : "bg-blue-400"
                  }`} />
                  <div className="bg-surface-700/50 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${typeColors[record.type]}`}>
                        {typeLabels[record.type]}
                      </span>
                      <span className="text-xs text-zinc-500">{new Date(record.createdAt).toLocaleString("zh-CN")}</span>
                      <span className="text-xs text-zinc-500 ml-auto font-mono">{record.author}</span>
                    </div>
                    <p className="text-sm text-zinc-300 mb-2">{record.description}</p>
                    {record.beforeValue !== record.afterValue && (
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="text-zinc-500 line-through">{record.beforeValue}</span>
                        <span className="text-zinc-400">→</span>
                        <span className="text-emerald">{record.afterValue}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        影响范围: {record.impactScope.join("、")}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        来源行: {record.sourceLine}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
