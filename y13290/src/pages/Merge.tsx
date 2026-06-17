import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw, AlertTriangle, Layers, Unlink } from "lucide-react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";
import GroupCard from "@/components/GroupCard";

export default function MergePage() {
  const groups = useStore((s) => s.groups);
  const entries = useStore((s) => s.entries);
  const loading = useStore((s) => s.loadingGroups);
  const fetchGroups = useStore((s) => s.fetchGroups);
  const runMerge = useStore((s) => s.runMerge);
  const groupEntry = useStore((s) => s.groupEntry);
  const showToast = useStore((s) => s.showToast);

  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const ungrouped = useMemo(() => entries.filter((e) => e.group_id == null), [entries]);

  const handleRun = async () => {
    setRunning(true);
    try {
      await runMerge();
      showToast("归并完成");
    } catch {
      showToast("归并失败");
    } finally {
      setRunning(false);
    }
  };

  const handleAssign = async (entryId: number, groupId: number) => {
    if (!groupId) return;
    try {
      await groupEntry(entryId, groupId);
      showToast("已归入该组");
    } catch {
      showToast("归入失败");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Layers size={16} className="text-slate-400" />
          共 <span className="font-semibold text-slate-800">{groups.length}</span> 个归并组
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">未归并 {ungrouped.length} 条</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchGroups()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} className={cn(loading && "animate-spin")} />
            刷新
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={running || groups.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            重跑归并
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            <Play size={15} />
            {running ? "执行中…" : "执行归并"}
          </button>
        </div>
      </div>

      {loading && groups.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          加载中…
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16 text-slate-400">
          <Layers size={32} className="mb-2 opacity-60" />
          <p className="text-sm">暂无归并结果</p>
          <p className="mt-1 text-xs">点击「执行归并」基于已录入条目生成归并组</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Unlink size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">未归并条目</h2>
          <span className="ml-auto text-xs text-slate-400">{ungrouped.length} 条</span>
        </div>
        {ungrouped.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">所有条目均已归并</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ungrouped.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="font-medium text-slate-700">{entry.name}</span>
                <span className="text-slate-500">
                  {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                </span>
                <span className="text-slate-400">{entry.opinion}</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-slate-400">归入</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      handleAssign(entry.id, Number(e.target.value));
                      e.target.value = "";
                    }}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="" disabled>
                      选择归并组
                    </option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        #{g.id} {g.merged_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="animate-fade-in w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-amber-600">
              <AlertTriangle size={20} />
              <h3 className="text-base font-semibold text-slate-800">确认重跑归并</h3>
            </div>
            <p className="mb-5 text-sm text-slate-600">
              重跑将清除当前所有归并组及备注，并基于全部已录入条目重新归并。确定继续？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  handleRun();
                }}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
              >
                确认重跑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
