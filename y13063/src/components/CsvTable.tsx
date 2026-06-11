import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_POINTS } from '@/data/mockPoints';
import { FLAG_LABELS } from '@/types';
import type { FlagType, MonitoringPoint } from '@/types';
import { Download, AlertCircle } from 'lucide-react';
import { pointsToCsv, downloadCsv } from '@/utils/csv';

export default function CsvTable() {
  const filterState = useAppStore((s) => s.filterState);
  const notes = useAppStore((s) => s.notes);
  const selectPoint = useAppStore((s) => s.selectPoint);
  const selectedId = useAppStore((s) => s.selectedPointId);

  const filtered = useMemo(() => {
    return MOCK_POINTS.filter((p: MonitoringPoint) => {
      if (filterState.codes.length > 0 && !filterState.codes.includes(p.code)) return false;
      if (p.depth < filterState.minDepth || p.depth > filterState.maxDepth) return false;
      if (filterState.flags.length > 0) {
        const hit = filterState.flags.some((f) => p.flags.includes(f));
        if (!hit) return false;
      }
      return true;
    });
  }, [filterState]);

  function handleExport() {
    const csv = pointsToCsv(filtered, notes);
    downloadCsv(`地下水监测井_CSV明细_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  const abnormalCount = filtered.filter((p) => p.flags.length > 0).length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-brand-100 flex items-center justify-between bg-brand-50/30">
        <div className="text-xs text-brand-700 flex items-center gap-2">
          <span>
            共 <b className="text-brand-800">{filtered.length}</b> 条
          </span>
          {abnormalCount > 0 && (
            <span className="flex items-center gap-1 text-accent-rust">
              <AlertCircle className="w-3.5 h-3.5" />
              异常 {abnormalCount} 条
            </span>
          )}
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          导出当前
        </button>
      </div>

      <div className="flex-1 overflow-auto scroll-thin">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-brand-50 text-brand-700">
            <tr>
              <th className="px-2 py-2 text-left font-medium border-b border-brand-200">编号</th>
              <th className="px-2 py-2 text-right font-medium border-b border-brand-200">X</th>
              <th className="px-2 py-2 text-right font-medium border-b border-brand-200">深度</th>
              <th className="px-2 py-2 text-right font-medium border-b border-brand-200">水位</th>
              <th className="px-2 py-2 text-left font-medium border-b border-brand-200">版本</th>
              <th className="px-2 py-2 text-left font-medium border-b border-brand-200">标记</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const abnormal = p.flags.length > 0;
              const selected = selectedId === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => selectPoint(p.id)}
                  className={`cursor-pointer transition-colors ${
                    selected
                      ? 'bg-brand-100'
                      : abnormal
                      ? 'bg-amber-50/50 hover:bg-amber-100/60'
                      : 'hover:bg-brand-50'
                  }`}
                >
                  <td className="px-2 py-1.5 border-b border-brand-100 font-medium text-brand-800">
                    {p.code}
                  </td>
                  <td className="px-2 py-1.5 text-right border-b border-brand-100 text-brand-700 tabular-nums">
                    {p.x.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right border-b border-brand-100 text-brand-700 tabular-nums">
                    {p.depth.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right border-b border-brand-100 text-brand-700 tabular-nums">
                    {p.waterLevel.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 border-b border-brand-100">
                    <span
                      className={`text-[10px] ${
                        p.coordVersion === 'v1' ? 'text-amber-700' : 'text-green-700'
                      }`}
                    >
                      {p.coordVersion === 'v1' ? '📜旧版' : '新版'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border-b border-brand-100">
                    {abnormal ? (
                      <div className="flex flex-wrap gap-0.5">
                        {p.flags.map((f: FlagType) => (
                          <span
                            key={f}
                            title={FLAG_LABELS[f].label}
                            className="text-[12px] leading-none"
                          >
                            {FLAG_LABELS[f].emoji}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-brand-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-brand-400 text-sm py-8">无匹配数据</div>
        )}
      </div>
    </div>
  );
}
