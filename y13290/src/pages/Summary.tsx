import { Fragment, useEffect, useState } from "react";
import { Download, RefreshCw, ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export default function SummaryPage() {
  const groups = useStore((s) => s.groups);
  const loading = useStore((s) => s.loadingGroups);
  const fetchGroups = useStore((s) => s.fetchGroups);
  const exportCsv = useStore((s) => s.exportCsv);
  const showToast = useStore((s) => s.showToast);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCsv();
      showToast("CSV 已开始下载");
    } catch {
      showToast("导出失败");
    } finally {
      setExporting(false);
    }
  };

  const totalEntries = groups.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <FileSpreadsheet size={16} className="text-slate-400" />
          共 <span className="font-semibold text-slate-800">{groups.length}</span> 组 ·
          <span className="ml-1">{totalEntries} 条原始记录</span>
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
            onClick={handleExport}
            disabled={exporting || groups.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-900 disabled:opacity-50"
          >
            <Download size={15} />
            {exporting ? "导出中…" : "导出 CSV"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading && groups.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">加载中…</div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileSpreadsheet size={32} className="mb-2 opacity-60" />
            <p className="text-sm">暂无归并数据</p>
            <p className="mt-1 text-xs">请先在「归并操作」页面执行归并</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-4 py-2 font-medium"></th>
                  <th className="px-3 py-2 font-medium">组号</th>
                  <th className="px-3 py-2 font-medium">归并名称</th>
                  <th className="px-3 py-2 font-medium">归并坐标</th>
                  <th className="px-3 py-2 font-medium">备注</th>
                  <th className="px-4 py-2 text-right font-medium">原始条目数</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isOpen = expanded.has(group.id);
                  return (
                    <Fragment key={group.id}>
                      <tr
                        onClick={() => toggle(group.id)}
                        className="row-hover cursor-pointer border-b border-slate-50"
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td className="px-3 py-3 text-slate-500">#{group.id}</td>
                        <td className="px-3 py-3 font-medium text-slate-800">{group.merged_name}</td>
                        <td className="px-3 py-3 text-slate-500">
                          {group.merged_latitude.toFixed(6)}, {group.merged_longitude.toFixed(6)}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {group.remark || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {group.entries.length}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-100 bg-slate-50/40">
                          <td></td>
                          <td colSpan={5} className="px-3 py-3">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-slate-500">
                                    <th className="px-2 py-1 font-medium">名称</th>
                                    <th className="px-2 py-1 font-medium">坐标</th>
                                    <th className="px-2 py-1 font-medium">意见</th>
                                    <th className="px-2 py-1 font-medium">来源</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.entries.map((entry) => (
                                    <tr key={entry.id} className="align-top">
                                      <td className="px-2 py-1.5 font-medium text-slate-700">{entry.name}</td>
                                      <td className="px-2 py-1.5 text-slate-500">
                                        {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                                      </td>
                                      <td className="px-2 py-1.5 text-slate-600">{entry.opinion}</td>
                                      <td className="px-2 py-1.5 text-slate-500">{entry.source}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
