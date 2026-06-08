import { Search, RotateCcw, Filter } from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import {
  ANOMALY_LABELS,
  SEVERITY_LABELS,
  ANOMALY_COLORS,
  SEVERITY_DOT,
  type AnomalyType,
  type Severity,
} from '@/types';

export default function FilterPanel() {
  const filter = useProjectionStore((s) => s.filter);
  const setFilter = useProjectionStore((s) => s.setFilter);
  const toggleAnomalyType = useProjectionStore((s) => s.toggleAnomalyType);
  const toggleSeverity = useProjectionStore((s) => s.toggleSeverity);
  const records = useProjectionStore((s) => s.records);
  const loadSampleData = useProjectionStore((s) => s.loadSampleData);
  const clearAll = useProjectionStore((s) => s.clearAll);

  const projects = Array.from(new Set(records.map((r) => r.projectName))).sort();

  const resetFilter = () => {
    setFilter({
      anomalyTypes: ['camera_view_lost', 'projection_distortion', 'scale_mismatch'],
      severities: ['critical', 'warning', 'info'],
      projectName: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      keyword: undefined,
      showNormal: false,
    });
  };

  const anomalyTypes: AnomalyType[] = ['camera_view_lost', 'projection_distortion', 'scale_mismatch'];
  const severities: Severity[] = ['critical', 'warning', 'info'];

  return (
    <aside className="w-64 shrink-0 border-r border-panel-border bg-panel-bg p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">筛选条件</span>
        </div>
        <button onClick={resetFilter} className="btn-ghost flex items-center gap-1" title="重置筛选">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>重置</span>
        </button>
      </div>

      <div className="mb-5">
        <label className="label-sm block mb-2">搜索</label>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={filter.keyword ?? ''}
            onChange={(e) => setFilter({ keyword: e.target.value || undefined })}
            placeholder="图片名 / 行号 / 备注"
            className="w-full bg-panel-surface border border-panel-border text-sm pl-8 pr-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 font-mono"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="label-sm block mb-2">异常类型</label>
        <div className="space-y-1.5">
          {anomalyTypes.map((t) => {
            const on = filter.anomalyTypes.includes(t);
            return (
              <label key={t} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleAnomalyType(t)}
                  className="w-3.5 h-3.5 border-panel-border bg-panel-surface accent-amber-500"
                />
                <span className={`chip ${ANOMALY_COLORS[t]}`}>
                  {ANOMALY_LABELS[t]}
                </span>
              </label>
            );
          })}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={filter.showNormal}
              onChange={(e) => setFilter({ showNormal: e.target.checked })}
              className="w-3.5 h-3.5 border-panel-border bg-panel-surface accent-lime-500"
            />
            <span className={`chip ${ANOMALY_COLORS.normal}`}>{ANOMALY_LABELS.normal}</span>
          </label>
        </div>
      </div>

      <div className="mb-5">
        <label className="label-sm block mb-2">严重程度</label>
        <div className="space-y-1.5">
          {severities.map((s) => {
            const on = filter.severities.includes(s);
            return (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleSeverity(s)}
                  className="w-3.5 h-3.5 border-panel-border bg-panel-surface accent-amber-500"
                />
                <span className={`w-2 h-2 ${SEVERITY_DOT[s]}`} />
                <span className="text-sm text-zinc-300">{SEVERITY_LABELS[s]}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mb-5">
        <label className="label-sm block mb-2">项目</label>
        <select
          value={filter.projectName ?? ''}
          onChange={(e) => setFilter({ projectName: e.target.value || undefined })}
          className="w-full bg-panel-surface border border-panel-border text-sm px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500/60"
        >
          <option value="">全部项目</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className="label-sm block mb-2">日期范围</label>
        <div className="space-y-2">
          <input
            type="date"
            value={filter.dateFrom ?? ''}
            onChange={(e) => setFilter({ dateFrom: e.target.value || undefined })}
            className="w-full bg-panel-surface border border-panel-border text-sm px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500/60"
          />
          <input
            type="date"
            value={filter.dateTo ?? ''}
            onChange={(e) => setFilter({ dateTo: e.target.value || undefined })}
            className="w-full bg-panel-surface border border-panel-border text-sm px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-panel-border mt-4">
        <div className="label-sm mb-2">数据</div>
        <div className="space-y-2">
          <button onClick={loadSampleData} className="w-full btn-secondary text-left text-xs">
            重新加载示例数据
          </button>
          <button onClick={clearAll} className="w-full text-xs text-zinc-500 hover:text-rose-400 transition-colors px-3 py-1.5">
            清空所有记录
          </button>
        </div>
      </div>
    </aside>
  );
}
