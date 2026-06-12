import { X, ArrowRightLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import { getUnitExplanation } from '@/utils/salinityConverter';

export default function SalinityUnitModal() {
  const open = useCalcStore(s => s.salinityUnitModalOpen);
  const close = useCalcStore(s => s.closeUnitModal);
  const salinity = useCalcStore(s => s.salinity);
  const normalize = useCalcStore(s => s.normalizeSalinityToPSU);
  if (!open) return null;
  const mismatches = salinity.filter(s => s.unitMismatch);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-card-hover w-[760px] max-w-[94vw] max-h-[88vh] flex flex-col overflow-hidden animate-slide-up">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-r from-ocean-50 to-white">
          <div className="w-8 h-8 rounded-full bg-status-deferred-soft flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-status-deferred" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-lg text-ocean-900">盐度单位混用校验</h2>
            <div className="text-xs text-ocean-700">检测到 <b className="text-status-deferred">{mismatches.length}</b> 条单位不一致记录，建议统一为 PSU（实用盐标 1978）以便后续计算</div>
          </div>
          <button className="btn-ghost" onClick={close}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 overflow-y-auto workbench-scroll flex-1 space-y-4">
          <div className="p-3 rounded bg-status-deferred-soft border border-status-deferred/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-status-deferred shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-medium text-status-deferred mb-1">换算口径说明</div>
              <div className="text-ocean-950 space-y-0.5">
                <div>· PSU 与 ‰（千分比）：数值近似 1:1（PSS-78 定义，常温下可视为等价）</div>
                <div>· ppt → PSU：除以 1.0043（历史质量分数换算）</div>
                <div>· mS/cm（电导率）→ PSU：依据 25℃ 标准电导率-盐度对照表线性插值</div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="bg-ocean-50 px-4 py-2 flex items-center justify-between text-xs text-ocean-700">
              <span>不一致记录明细（{mismatches.length} 条）</span>
              <span className="tabular-nums">目标统一口径：PSU</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-white sticky top-0">
                <tr className="text-ocean-700 border-t border-b border-slate-100">
                  <th className="px-3 py-2 text-left font-medium">站位</th>
                  <th className="px-3 py-2 text-left font-medium">时间</th>
                  <th className="px-3 py-2 text-right font-medium">深度</th>
                  <th className="px-3 py-2 text-right font-medium">原值</th>
                  <th className="px-3 py-2 text-center font-medium">原单位</th>
                  <th className="px-3 py-2 text-center">→</th>
                  <th className="px-3 py-2 text-right font-medium">→ PSU</th>
                  <th className="px-3 py-2 text-left font-medium">换算说明</th>
                </tr>
              </thead>
              <tbody>
                {mismatches.map(s => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-ocean-50/50">
                    <td className="px-3 py-1.5 tabular-nums font-mono">{s.station}</td>
                    <td className="px-3 py-1.5 tabular-nums text-ocean-700">{s.timestamp.slice(5)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right">{s.depth} m</td>
                    <td className="px-3 py-1.5 tabular-nums text-right font-mono text-status-deferred font-medium">
                      {s.value.toFixed(s.unit === 'mS/cm' ? 0 : 2)}
                    </td>
                    <td className="px-3 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded bg-status-deferred/15 text-status-deferred">{s.unit}</span></td>
                    <td className="px-3 py-1.5 text-center text-ocean-400">→</td>
                    <td className="px-3 py-1.5 tabular-nums text-right font-mono text-status-available font-medium">{(s.normalizedValue ?? s.value).toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-ocean-700 text-[11px]">{getUnitExplanation(s.unit, 'PSU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-xs text-ocean-700">
            统一后，原始单位与换算过程将保留在字段中，可随时回查来源
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={close}>暂不处理</button>
            <button className="btn-primary inline-flex items-center gap-1.5" onClick={normalize}>
              <CheckCircle className="w-4 h-4" />
              一键统一为 PSU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
