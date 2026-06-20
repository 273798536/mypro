import React, { useEffect } from 'react';
import {
  GitCompare, ChevronDown, Download, BarChart2, Database,
  FileSpreadsheet, Tag, ArrowRightLeft, Calendar
} from 'lucide-react';
import { CardShell } from '@/components/layout/CardShell';
import { CompareQuadrant } from '@/components/compare/CompareQuadrant';
import { useCompareStore } from '@/stores/compareStore';
import { formatTime } from '@/utils/time';

const ComparePage: React.FC = () => {
  const store = useCompareStore();

  useEffect(() => { store.init(); }, []);

  const prevV = store.versions.find(v => v.id === store.selectedPrevId);
  const currV = store.versions.find(v => v.id === store.selectedCurrId);

  const totalChanged = store.report
    ? store.report.samples.filter(s => s.changeType !== 'unchanged').length +
      store.report.thresholds.filter(s => s.changeType !== 'unchanged').length +
      store.report.corrections.filter(s => s.changeType !== 'unchanged').length +
      store.report.metrics.filter(s => s.changeType !== 'unchanged').length
    : 0;

  return (
    <div className="p-8 space-y-5 max-w-[1800px] mx-auto">
      <CardShell
        accent="info"
        title={<div className="flex items-center gap-2.5"><GitCompare className="w-4 h-4 text-info" strokeWidth={2} />版本对比 · 前版 vs 当前版</div>}
        subtitle="从四个维度分清楚：样本、阈值、人工修正、指标变化"
        bodyClassName="!pb-3"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-4 mb-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">前一版本</label>
            <div className="relative">
              <select
                value={store.selectedPrevId || ''}
                onChange={e => store.setPrev(e.target.value)}
                className="w-full appearance-none h-11 pl-4 pr-10 rounded-xl bg-root border border-border-emphasis text-[13px] font-mono text-primary focus:outline-none focus:border-info cursor-pointer"
              >
                {store.versions.map(v => (
                  <option key={v.id} value={v.id}>{v.versionCode} · 发布于 {formatTime(v.releaseTime)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          <div className="flex items-center justify-center h-11">
            <div className="w-11 h-11 rounded-full bg-info/20 border border-info/40 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-info" strokeWidth={2} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">当前版本</label>
            <div className="relative">
              <select
                value={store.selectedCurrId || ''}
                onChange={e => store.setCurr(e.target.value)}
                className="w-full appearance-none h-11 pl-4 pr-10 rounded-xl bg-root border border-amber/40 text-[13px] font-mono text-primary focus:outline-none focus:border-amber cursor-pointer glow-ring-amber"
              >
                {store.versions.map(v => (
                  <option key={v.id} value={v.id}>{v.versionCode} · 发布于 {formatTime(v.releaseTime)}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
            </div>
          </div>

          <div className="flex items-center justify-center h-11 px-2 text-muted">→</div>

          <div className="flex items-center gap-2 justify-end">
            <button className="btn-operate">
              <Download className="w-4 h-4" strokeWidth={1.8} />
              导出对比报告
            </button>
          </div>
        </div>

        {prevV && currV && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { key: 'samples', Icon: Database, label: '样本批次', prev: Object.keys(prevV.metrics).length, curr: Object.keys(currV.metrics).length, color: 'text-info', count: store.report?.samples.filter(s => s.changeType !== 'unchanged').length || 0 },
              { key: 'th', Icon: Tag, label: '阈值配置', prev: Object.keys(prevV.thresholdConfig).length, curr: Object.keys(currV.thresholdConfig).length, color: 'text-[#ec4899]', count: store.report?.thresholds.filter(s => s.changeType !== 'unchanged').length || 0 },
              { key: 'cor', Icon: FileSpreadsheet, label: '人工修正', prev: 1, curr: 2, color: 'text-amber', count: store.report?.corrections.filter(s => s.changeType !== 'unchanged').length || 0 },
              { key: 'met', Icon: BarChart2, label: '核心指标', prev: 4, curr: 4, color: 'text-emerald', count: store.report?.metrics.filter(s => s.changeType !== 'unchanged').length || 0 }
            ].map((it, idx) => (
              <div key={it.key} className="rounded-xl p-4 bg-root/50 border border-border-default animate-stagger-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <it.Icon className={`w-3.5 h-3.5 ${it.color}`} strokeWidth={2} />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">{it.label}</span>
                  </div>
                  {it.count > 0 ? (
                    <span className="chip !text-[10px] text-amber animate-count-pop">{it.count} 处变化</span>
                  ) : (
                    <span className="chip !text-[10px] text-emerald">无变化</span>
                  )}
                </div>
                <div className="flex items-end gap-2 font-mono">
                  <div className="text-[20px] font-bold text-secondary">{it.prev}</div>
                  <div className="pb-1 text-muted">→</div>
                  <div className="text-[22px] font-bold text-primary">{it.curr}</div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
                  <Calendar className="w-3 h-3" strokeWidth={1.5} />
                  <span>{prevV.versionCode} → {currV.versionCode}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardShell>

      {store.report && (
        <div className="animate-stagger-in">
          <CompareQuadrant report={store.report} />
        </div>
      )}

      {!store.report && (
        <CardShell>
          <div className="py-20 text-center text-muted text-sm">正在构建对比报告...</div>
        </CardShell>
      )}
    </div>
  );
};

export default ComparePage;
