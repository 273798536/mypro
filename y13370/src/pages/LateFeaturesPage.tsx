import React, { useEffect } from 'react';
import {
  TriangleAlert, ShieldAlert, Filter, Download, Search,
  FileCheck, ToggleLeft, ToggleRight
} from 'lucide-react';
import { CardShell } from '@/components/layout/CardShell';
import { WarningBanner } from '@/components/features/WarningBanner';
import { LateFeatureRow } from '@/components/features/LateFeatureRow';
import { RiskIndicator } from '@/components/features/RiskIndicator';
import { useFeatureStore } from '@/stores/featureStore';
import { useExportStore } from '@/stores/exportStore';
import type { RiskLevel } from '@/types';

const LateFeaturesPage: React.FC = () => {
  const store = useFeatureStore();
  const eStore = useExportStore();

  useEffect(() => { store.init(); }, []);

  const filtered = store.getFiltered();
  const riskLevels: RiskLevel[] = ['high', 'medium', 'low'];

  const toggleRisk = (r: RiskLevel) => {
    const has = store.riskFilter.includes(r);
    store.setRiskFilter(has ? store.riskFilter.filter(x => x !== r) : [...store.riskFilter, r]);
  };

  return (
    <div className="p-8 space-y-5 max-w-[1600px] mx-auto">
      <WarningBanner mixedCount={store.getMixedCount()} highRiskCount={store.getHighRiskCount()} />

      <CardShell
        accent="danger"
        title={<div className="flex items-center gap-2.5"><TriangleAlert className="w-4 h-4 text-danger" strokeWidth={2} />特征迟到专区 · 单独拎出，避免揉进正常结果</div>}
        subtitle="运营主管重点关注：迟到特征单独展示，与正常结果隔离，防止污染正常训练结论"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '总迟到记录', value: store.features.length, Icon: FileCheck, color: 'info' },
            { label: '高风险', value: store.getHighRiskCount(), Icon: ShieldAlert, color: 'danger' },
            { label: '已揉入正常结果', value: store.getMixedCount(), Icon: TriangleAlert, color: 'amber' },
            { label: '已成功隔离', value: store.features.length - store.getMixedCount(), Icon: ShieldAlert, color: 'emerald' }
          ].map((it, idx) => {
            const colorMap: Record<string, string> = {
              info: 'from-info/25 to-info/5 border-info/40 text-info',
              danger: 'from-danger/25 to-danger/5 border-danger/40 text-danger glow-ring-red',
              amber: 'from-amber/25 to-amber/5 border-amber/40 text-amber',
              emerald: 'from-emerald/25 to-emerald/5 border-emerald/40 text-emerald glow-ring-emerald'
            };
            return (
              <div key={idx} className={`rounded-xl p-4 bg-gradient-to-br border animate-stagger-in ${colorMap[it.color]}`} style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{it.label}</div>
                    <div className="mt-2 text-[28px] font-bold font-mono text-primary animate-count-pop">{it.value}</div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-root/40 border border-current flex items-center justify-center">
                    <it.Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-5 border-b border-border-default">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted mr-1">
              <Filter className="w-3 h-3 inline mr-1 -mt-0.5" strokeWidth={2} />筛选:
            </span>
            <button
              onClick={() => store.setOnlyMixedIn(!store.onlyMixedIn)}
              className={`chip transition-all ${
                store.onlyMixedIn
                  ? 'text-danger bg-danger/15 border-danger/40 animate-pulse-amber'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              {store.onlyMixedIn
                ? <><ToggleRight className="w-3.5 h-3.5" strokeWidth={2.5} /> 仅看已揉入</>
                : <><ToggleLeft className="w-3.5 h-3.5" strokeWidth={2} /> 仅看已揉入</>}
            </button>
            {riskLevels.map(r => {
              const active = store.riskFilter.includes(r);
              return (
                <button key={r} onClick={() => toggleRisk(r)} className="transition-all">
                  <RiskIndicator level={r} size="sm" />
                </button>
              );
            })}
            {(store.riskFilter.length > 0 || store.onlyMixedIn) && (
              <button
                onClick={() => { store.setOnlyMixedIn(false); store.setRiskFilter([]); }}
                className="chip text-muted hover:text-secondary"
              >清除</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} />
              <input
                placeholder="搜索特征名..."
                className="w-56 h-8 pl-8 pr-3 rounded-lg bg-elevated border border-border-default text-[11px] text-primary placeholder:text-muted focus:outline-none focus:border-danger/40"
              />
            </div>
            <button
              onClick={() => eStore.exportLateFeatures(filtered)}
              disabled={eStore.isExporting}
              className="btn-operate btn-primary !py-1.5 !px-3 !text-[11px]"
            >
              <Download className="w-3.5 h-3.5" />
              导出隔离清单 (CSV)
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted border border-dashed border-border-emphasis rounded-xl">
              当前筛选条件下无特征迟到记录
            </div>
          ) : (
            filtered.map((f, i) => <LateFeatureRow key={f.id} feature={f} index={i} />)
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border-default flex items-center justify-between text-[11px] text-muted">
            <span>
              共 {filtered.length} 条记录 ·
              其中 <span className="text-danger font-semibold">{filtered.filter(f => f.mixedInNormal).length} 条揉入正常结果</span>
              {filtered.filter(f => f.mixedInNormal).length > 0 && ' · 请运营主管确认隔离'}
            </span>
            {eStore.isExporting && (
              <span className="flex items-center gap-2">
                <span className="w-24 h-1.5 rounded-full bg-root overflow-hidden">
                  <span
                    className="block h-full bg-gradient-to-r from-amber to-danger transition-all duration-100"
                    style={{ width: `${eStore.exportProgress}%` }}
                  />
                </span>
                导出中 {eStore.exportProgress}%
              </span>
            )}
          </div>
        )}
      </CardShell>

      {eStore.lastExportLog && (
        <div className="fixed bottom-6 right-6 z-40 animate-stagger-in">
          <div className="rounded-xl bg-emerald/15 border border-emerald/40 glow-ring-emerald px-4 py-3 flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-emerald animate-draw-check" strokeWidth={2.5} />
            <div>
              <div className="text-[12px] font-semibold text-emerald">导出完成</div>
              <div className="text-[10px] text-secondary">{eStore.lastExportLog}</div>
            </div>
            <button onClick={eStore.clearLog} className="ml-2 text-muted hover:text-primary text-[11px]">×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LateFeaturesPage;
