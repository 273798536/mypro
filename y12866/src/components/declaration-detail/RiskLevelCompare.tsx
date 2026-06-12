import { ArrowRight } from 'lucide-react';
import type { Declaration, RiskLevel } from '@/types';
import { useDeclarationStore } from '@/stores/useDeclarationStore';
import { getRiskLevelLabel } from '@/utils/riskEngine';
import RiskLevelBadge from '@/components/common/RiskLevelBadge';

interface Props {
  declaration: Declaration;
}

export default function RiskLevelCompare({ declaration }: Props) {
  const updateRiskLevel = useDeclarationStore(s => s.updateRiskLevel);
  const hasChange = declaration.initialRiskLevel !== declaration.currentRiskLevel;

  const handleRiskChange = (newLevel: RiskLevel) => {
    const reason = prompt(`请输入将风险等级从"${getRiskLevelLabel(declaration.currentRiskLevel)}"调整为"${getRiskLevelLabel(newLevel)}"的原因：`);
    if (reason) {
      updateRiskLevel(declaration.id, newLevel, reason, ['风险等级']);
    }
  };

  return (
    <div className="card-ocean p-4">
      <h3 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-ocean-800 rounded-full" />
        风险分层判定
      </h3>

      <div className="flex items-center gap-4 flex-wrap">
        <div className={`flex-1 min-w-[160px] p-3 rounded-lg border-2 ${hasChange ? 'border-dashed border-slate-300 bg-slate-50' : 'border-ocean-200 bg-ocean-50'} transition-all`}>
          <div className="text-[10px] text-slate-400 mb-1">初始判定</div>
          <RiskLevelBadge level={declaration.initialRiskLevel} size="lg" />
        </div>

        <div className="flex-shrink-0">
          <ArrowRight className={`w-5 h-5 ${hasChange ? 'text-amber-500' : 'text-slate-300'}`} />
        </div>

        <div className={`flex-1 min-w-[160px] p-3 rounded-lg border-2 ${hasChange ? 'border-amber-400 bg-amber-50' : 'border-ocean-200 bg-ocean-50'} transition-all`}>
          <div className="text-[10px] text-slate-400 mb-1">当前判定</div>
          <RiskLevelBadge level={declaration.currentRiskLevel} size="lg" />
        </div>
      </div>

      {hasChange && (
        <div className="mt-3 space-y-2">
          {declaration.riskChangeHistory.map((change) => (
            <div key={change.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs animate-flip-in">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <span>变更：{getRiskLevelLabel(change.beforeLevel)} → {getRiskLevelLabel(change.afterLevel)}</span>
                <span className="text-amber-500">|</span>
                <span className="text-amber-600">{change.changedBy}</span>
              </div>
              <p className="text-amber-700 mt-1">原因：{change.reason}</p>
              <div className="text-[10px] text-amber-500 mt-1">
                {change.timestamp} · 影响字段：{change.affectedFields.join('、')}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-[10px] text-slate-400 mb-2">调整风险等级：</div>
        <div className="flex gap-2">
          {(['high', 'medium', 'low'] as RiskLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleRiskChange(level)}
              disabled={declaration.currentRiskLevel === level}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                declaration.currentRiskLevel === level
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-white border border-slate-200 hover:border-ocean-400 text-slate-600 hover:text-ocean-800'
              }`}
            >
              {getRiskLevelLabel(level)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
