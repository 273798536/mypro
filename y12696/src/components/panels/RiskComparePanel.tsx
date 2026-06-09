import { useRiskStore } from '@/stores/useRiskStore';
import { useSceneStore } from '@/stores/useSceneStore';
import { riskCompareExplanation } from '@/data/explanations';
import {
  GitCompare,
  Edit3,
  Save,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Info,
  ArrowRight,
} from 'lucide-react';

const severityColor = {
  danger: 'text-rose-400 bg-rose-500/10 border-rose-500/40',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/40',
  info: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/40',
};

const severityLabel = {
  danger: '危险',
  warning: '警告',
  info: '提示',
};

const severityIcon = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function RiskComparePanel() {
  const risk = useRiskStore();
  const impactedIds = risk.getImpactedIds();
  const verifyAnomaly = useSceneStore((s) => s.verifyAnomaly);

  const orig = risk.originalRemark;
  const curr = risk.currentRemark;
  const hasChanges = curr.content !== orig.content || risk.showCompare;

  return (
    <div className="space-y-4 p-4">
      {/* 头部说明 */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
        <div className="flex items-start gap-2">
          <GitCompare size={16} className="mt-0.5 shrink-0 text-blue-400" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-blue-300">新旧结论并排看：</span>
            {riskCompareExplanation}
          </div>
        </div>
      </div>

      {/* 编辑备注 */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">修改风险备注</span>
          </div>
          {hasChanges && (
            <button
              onClick={risk.resetToOriginal}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
            >
              <RotateCcw size={11} />
              还原
            </button>
          )}
        </div>
        <textarea
          value={risk.editingRemark}
          onChange={(e) => risk.setEditingRemark(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition focus:border-cyan-500/60"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={risk.applyRemarkEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-500 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:shadow-cyan-500/30"
          >
            <Save size={12} />
            应用修改并对比
          </button>
          <button
            onClick={risk.toggleCompare}
            className="flex items-center gap-1 rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700"
          >
            {risk.showCompare ? '隐藏对比' : '显示对比'}
          </button>
        </div>
      </div>

      {/* 备注版本对比 */}
      {risk.showCompare && (
        <div className="overflow-hidden rounded-lg border border-slate-700/60">
          <div className="grid grid-cols-2 border-b border-slate-700">
            <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2">
              <ChevronLeft size={12} className="text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-400">
                原始结论
              </span>
              <span className="ml-auto text-[9px] text-slate-500">
                {orig.modifier} · {new Date(orig.modifiedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-700 bg-cyan-500/5 px-3 py-2">
              <span className="text-[11px] font-semibold text-cyan-300">
                修改后结论
              </span>
              <ChevronRight size={12} className="text-cyan-500" />
              <span className="ml-auto text-[9px] text-cyan-500/70">
                {curr.modifier} · {new Date(curr.modifiedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2">
            <div className="bg-slate-800/30 p-3 text-[11px] text-slate-400 leading-relaxed">
              {orig.content}
            </div>
            <div className="border-l border-slate-700 bg-slate-800/50 p-3 text-[11px] text-slate-200 leading-relaxed">
              {curr.content}
            </div>
          </div>
          <div className="border-t border-slate-700 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300">
            <AlertTriangle size={10} className="mr-1 inline" />
            影响结论数: <b>{impactedIds.length}</b> 条，请确认影响范围是否符合预期
          </div>
        </div>
      )}

      {/* 受影响的异常结论对比 */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-200">结论项对比</h3>
        {risk.originalAnomalies.map((origAnom, idx) => {
          const modAnom = risk.modifiedAnomalies[idx];
          const changed = origAnom.severity !== modAnom.severity || origAnom.title !== modAnom.title;
          const isImpacted = impactedIds.includes(origAnom.id);
          const OrigIcon = severityIcon[origAnom.severity];
          const ModIcon = severityIcon[modAnom.severity];

          return (
            <div
              key={origAnom.id}
              className={`overflow-hidden rounded-lg border transition-all ${
                changed
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-slate-700/50 bg-slate-800/30'
              }`}
            >
              {changed && (
                <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-300">
                  ⚠ 该结论等级被修改
                </div>
              )}
              <div className="grid grid-cols-2">
                {/* 原始 */}
                <div className="p-2.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-bold ${severityColor[origAnom.severity]}`}>
                      <OrigIcon size={9} />
                      {severityLabel[origAnom.severity]}
                    </span>
                    <span className="text-[10px] text-slate-500">原始</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">{origAnom.title}</div>
                  <div className="mt-0.5 text-[10px] text-slate-600 leading-relaxed">{origAnom.description}</div>
                </div>
                {/* 修改后 */}
                <div className="border-l border-slate-700/60 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-bold ${severityColor[modAnom.severity]}`}>
                      <ModIcon size={9} />
                      {severityLabel[modAnom.severity]}
                    </span>
                    <span className="text-[10px] text-cyan-500">修改</span>
                  </div>
                  <div className={`text-[11px] font-semibold ${changed ? 'text-amber-300' : 'text-slate-300'}`}>
                    {modAnom.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 leading-relaxed">{modAnom.description}</div>
                </div>
              </div>
              {changed && (
                <div className="flex items-center gap-1.5 border-t border-slate-700/50 bg-slate-900/40 px-2.5 py-1.5 text-[10px]">
                  <ArrowRight size={10} className="text-amber-400" />
                  <span className="text-slate-400">
                    工程师把
                    <span className={`mx-1 rounded px-1 ${severityColor[origAnom.severity]}`}>{severityLabel[origAnom.severity]}</span>
                    降为
                    <span className={`mx-1 rounded px-1 ${severityColor[modAnom.severity]}`}>{severityLabel[modAnom.severity]}</span>
                    ，结合历史数据判断属累积性偏差
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
