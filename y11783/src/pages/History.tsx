import { useEffect, useState } from "react";
import { usePartitionStore } from "@/store";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, RotateCcw, Search, Clock } from "lucide-react";
import type { Session } from "@/types";

export default function History() {
  const sessions = usePartitionStore((s) => s.sessions);
  const loadSessions = usePartitionStore((s) => s.loadSessions);
  const deleteSession = usePartitionStore((s) => s.deleteSession);
  const restoreSession = usePartitionStore((s) => s.restoreSession);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const targetNums = s.results.map((r) => r.config.targetNumber).join(" ");
    return targetNums.includes(search);
  });

  const compareSessions = compareIds
    .map((id) => sessions.find((s) => s.id === id))
    .filter(Boolean) as Session[];

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((cid) => cid !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft size={16} />
            返回工作台
          </Link>
          <h1
            className="text-xl font-bold text-amber-400"
            style={{ fontFamily: "'LXGW WenKai', cursive" }}
          >
            历史记录
          </h1>
        </div>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索目标整数..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        {compareIds.length === 2 && (
          <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4">
            <h3
              className="text-sm font-semibold text-amber-400 mb-3"
              style={{ fontFamily: "'LXGW WenKai', cursive" }}
            >
              会话对比
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {compareSessions.map((session) => {
                const lastResult = session.results[session.results.length - 1];
                return (
                  <div
                    key={session.id}
                    className="bg-slate-800/50 rounded-lg p-3 space-y-2"
                  >
                    <div className="text-xs text-slate-400">
                      目标数：{lastResult?.config.targetNumber ?? "-"} | 方案数：
                      {lastResult?.filteredPartitions.length ?? 0}
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {lastResult?.filteredPartitions.slice(0, 20).map((p, i) => (
                        <div key={i} className="text-xs text-emerald-400 font-mono">
                          {p.join(" + ")}
                        </div>
                      ))}
                      {(lastResult?.filteredPartitions.length ?? 0) > 20 && (
                        <div className="text-xs text-slate-500">
                          ...还有 {(lastResult!.filteredPartitions.length - 20)} 条
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setCompareIds([])}
              className="mt-3 text-xs text-slate-400 hover:text-amber-400 transition-colors"
            >
              取消对比
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Clock size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500">暂无历史记录</p>
            <Link
              to="/"
              className="inline-block mt-4 text-sm text-amber-400 hover:underline"
            >
              前往工作台开始使用
            </Link>
          </div>
        )}

        {filtered.map((session) => {
          const lastResult = session.results[session.results.length - 1];
          const isExpanded = expandedId === session.id;

          return (
            <div
              key={session.id}
              className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
                onClick={() =>
                  setExpandedId(isExpanded ? null : session.id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <div className="text-sm font-medium">
                      目标整数：{lastResult?.config.targetNumber ?? "-"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(session.createdAt).toLocaleString("zh-CN")} |
                      {session.results.length} 次计算 |
                      {session.corrections.length} 次修正
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lastResult && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        lastResult.source === "import"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {lastResult.source === "import" ? "导入" : "手动"}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {lastResult?.filteredPartitions.length ?? 0} 个方案
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-800/60 px-5 py-4 space-y-4">
                  <div>
                    <h4 className="text-xs text-slate-400 mb-2">计算历史</h4>
                    <div className="space-y-1">
                      {session.results.map((result, i) => (
                        <div
                          key={result.id}
                          className="flex items-center gap-3 text-xs"
                        >
                          <span className="text-slate-600">#{i + 1}</span>
                          <span className="text-amber-400">
                            目标 {result.config.targetNumber}
                          </span>
                          <span className="text-emerald-400">
                            {result.filteredPartitions.length} 方案
                          </span>
                          <span className="text-slate-500">
                            {new Date(result.timestamp).toLocaleTimeString(
                              "zh-CN"
                            )}
                          </span>
                          {result.importMeta && (
                            <span className="text-amber-400/70">
                              ← {result.importMeta.filename}(
                              {result.importMeta.strategy})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {session.corrections.length > 0 && (
                    <div>
                      <h4 className="text-xs text-slate-400 mb-2">
                        修正痕迹
                      </h4>
                      <div className="space-y-1">
                        {session.corrections.map((c) => (
                          <div
                            key={c.id}
                            className="text-xs flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-slate-400">
                              {new Date(c.timestamp).toLocaleTimeString("zh-CN")}
                            </span>
                            <span className="text-amber-400">{c.field}</span>
                            <span className="text-slate-500">
                              {String(c.oldValue)} → {String(c.newValue)}
                            </span>
                            <span className="text-slate-600">({c.reason})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/40">
                    <button
                      onClick={() => {
                        restoreSession(session);
                      }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <RotateCcw size={12} />
                      恢复到工作台
                    </button>
                    <button
                      onClick={() => toggleCompare(session.id)}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors ${
                        compareIds.includes(session.id)
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      对比
                      {compareIds.includes(session.id) ? " ✓" : ""}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id);
                      }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={12} />
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
