import { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApiStore } from '@/stores/useApiStore';
import { useBusinessStore } from '@/stores/useBusinessStore';
import * as apiSimulator from '@/utils/apiSimulator';
import type { ApiMethod, ApiLog } from '@/shared/types';

const TAB_LABELS: Record<ApiMethod, string> = {
  start: '启动',
  rerun: '重跑',
  view: '查看',
};

const TAB_COLORS: Record<ApiMethod, string> = {
  start: 'text-amber-warn border-amber-warn',
  rerun: 'text-cyan-glow border-cyan-glow',
  view: 'text-green-ok border-green-ok',
};

export default function ApiDrawer() {
  const {
    showDrawer,
    setShowDrawer,
    drawerTab,
    setDrawerTab,
    logs,
    viewComplaintId,
    setViewComplaintId,
    setLastViewResult,
    lastRawJson,
    lastMappedTable,
    appendLog,
  } = useApiStore();
  const { complaints } = useBusinessStore();
  const [selectedLogIdx, setSelectedLogIdx] = useState<number | null>(null);

  const filteredLogs = useMemo(
    () => logs.filter((l) => l.method === drawerTab),
    [logs, drawerTab]
  );

  const selectedLog = selectedLogIdx !== null ? filteredLogs[selectedLogIdx] : null;

  useEffect(() => {
    setSelectedLogIdx(null);
  }, [drawerTab]);

  useEffect(() => {
    if (drawerTab === 'view' && showDrawer) {
      (async () => {
        const result = await apiSimulator.view(complaints, viewComplaintId || undefined);
        setLastViewResult(result.rawJson, result.mappedTable);
        result.logs.forEach((log) => appendLog(log));
      })();
    }
  }, [drawerTab, showDrawer, viewComplaintId, complaints, setLastViewResult, appendLog]);

  if (!showDrawer) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: number) => {
    const color = status >= 200 && status < 300 ? 'text-green-ok border-green-ok/30' : 'text-red-reject border-red-reject/30';
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${color} font-mono`}>
        {status}
      </span>
    );
  };

  const displayJson = drawerTab === 'view' ? lastRawJson : selectedLog ? JSON.stringify(selectedLog, null, 2) : '';
  const displayTable = drawerTab === 'view' ? lastMappedTable : selectedLog ? [selectedLog.response as Record<string, unknown>] : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowDrawer(false)}
      />
      <div className="relative w-3/5 bg-panel-blue border-l border-white/10 shadow-panel h-full flex flex-col">
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(['start', 'rerun', 'view'] as ApiMethod[]).map((t) => (
              <button
                key={t}
                onClick={() => setDrawerTab(t)}
                className={`px-4 py-1.5 text-sm border-b-2 transition-colors ${
                  drawerTab === t
                    ? TAB_COLORS[t]
                    : 'text-white/40 border-transparent hover:text-white/70'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowDrawer(false)}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {drawerTab === 'view' && (
          <div className="px-5 py-2 border-b border-white/10 flex items-center gap-2">
            <span className="text-xs text-white/50">选择投诉：</span>
            <select
              value={viewComplaintId || ''}
              onChange={(e) => setViewComplaintId(e.target.value || null)}
              className="bg-space-deep border border-white/10 rounded-sm px-2 py-1 text-xs text-white/80 focus:outline-none"
            >
              <option value="">全部</option>
              {complaints.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id.slice(-8)} - {c.intersection}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-1/3 border-b border-white/10 overflow-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-sm">暂无日志</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredLogs.map((log: ApiLog, i: number) => (
                  <div
                    key={i}
                    onClick={() => setSelectedLogIdx(i)}
                    className={`px-5 py-2.5 cursor-pointer transition-colors flex items-center gap-3 ${
                      selectedLogIdx === i ? 'bg-white/5' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs text-white/40 font-mono w-16 shrink-0">
                      {formatTime(log.ts)}
                    </span>
                    <span className={`text-xs font-mono uppercase w-14 shrink-0 ${TAB_COLORS[log.method]}`}>
                      {log.method}
                    </span>
                    <span className="text-xs text-white/60 font-mono shrink-0">
                      {log.durationMs}ms
                    </span>
                    {getStatusBadge(log.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 flex min-h-0">
            <div className="w-1/2 border-r border-white/10 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-white/10 text-xs text-white/50">
                原始 JSON
              </div>
              <div className="flex-1 overflow-auto bg-space-deep p-4">
                <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-all leading-relaxed">
                  {displayJson || '请选择一条日志'}
                </pre>
              </div>
            </div>
            <div className="w-1/2 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-white/10 text-xs text-white/50">
                映射字段
              </div>
              <div className="flex-1 overflow-auto">
                {displayTable.length === 0 ? (
                  <div className="p-8 text-center text-white/30 text-sm">请选择一条日志</div>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {displayTable.map((row, ri) => (
                        Object.entries(row).map(([k, v], ci) => (
                          <tr key={`${ri}-${ci}`} className="border-b border-white/5">
                            <td className="px-3 py-1.5 text-white/50 w-1/3 align-top">
                              {k}
                            </td>
                            <td className="px-3 py-1.5 text-white/80 font-mono break-all">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
