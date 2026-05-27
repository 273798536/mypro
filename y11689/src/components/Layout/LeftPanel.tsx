import { AlertTriangle, Clock, DollarSign, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Risk } from '../../types';
import { useRiskStore } from '../../store/useRiskStore';
import { useViewStore } from '../../store/useViewStore';
import { getRiskTypeLabel, getRiskSeverityColor, getRiskSeverityLabel } from '../../utils/riskDetector';

interface RiskCardProps {
  risk: Risk;
  isSelected: boolean;
  onClick: () => void;
}

const RiskCard = ({ risk, isSelected, onClick }: RiskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const resolveRisk = useRiskStore((state) => state.resolveRisk);

  const getTypeIcon = () => {
    switch (risk.type) {
      case 'revenue_delay':
        return <Clock className="w-4 h-4" />;
      case 'expense_duplicate':
        return <DollarSign className="w-4 h-4" />;
      case 'milestone_misalignment':
        return <Calendar className="w-4 h-4" />;
      case 'budget_overrun':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleResolve = (e: React.MouseEvent) => {
    e.stopPropagation();
    resolveRisk(risk.id);
  };

  return (
    <div
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10'
          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
      } ${risk.resolved ? 'opacity-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${getRiskSeverityColor(risk.severity)}20` }}
        >
          <div style={{ color: getRiskSeverityColor(risk.severity) }}>
            {getTypeIcon()}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-400">
              {getRiskTypeLabel(risk.type)}
            </span>
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: `${getRiskSeverityColor(risk.severity)}20`,
                color: getRiskSeverityColor(risk.severity)
              }}
            >
              {getRiskSeverityLabel(risk.severity)}
            </span>
            {risk.resolved && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                已解决
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 line-clamp-2">
            {risk.description}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            检测时间：{new Date(risk.detectedAt).toLocaleString('zh-CN')}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="p-1 hover:bg-slate-700 rounded"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex gap-2">
            {!risk.resolved && (
              <button
                onClick={handleResolve}
                className="flex-1 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
              >
                标记为已解决
              </button>
            )}
            <button className="flex-1 py-1.5 text-xs font-medium text-slate-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
              查看详情
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const LeftPanel = () => {
  const risks = useRiskStore((state) => state.risks);
  const selectedRiskId = useRiskStore((state) => state.selectedRiskId);
  const selectRisk = useRiskStore((state) => state.selectRisk);
  const leftPanelOpen = useViewStore((state) => state.leftPanelOpen);
  const toggleLeftPanel = useViewStore((state) => state.toggleLeftPanel);

  const unresolvedRisks = risks.filter((r) => !r.resolved);
  const resolvedRisks = risks.filter((r) => r.resolved);

  const revenueDelays = unresolvedRisks.filter((r) => r.type === 'revenue_delay');
  const expenseDuplicates = unresolvedRisks.filter((r) => r.type === 'expense_duplicate');
  const milestoneIssues = unresolvedRisks.filter((r) => r.type === 'milestone_misalignment');
  const budgetOverruns = unresolvedRisks.filter((r) => r.type === 'budget_overrun');

  if (!leftPanelOpen) {
    return (
      <button
        onClick={toggleLeftPanel}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-r-xl hover:bg-slate-700 transition-colors"
      >
        <ChevronDown className="w-5 h-5 text-slate-400 rotate-90" />
      </button>
    );
  }

  return (
    <aside className="w-80 bg-slate-900/60 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            风险预警
          </h2>
          <button
            onClick={toggleLeftPanel}
            className="p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-orange-400">{revenueDelays.length}</p>
            <p className="text-xs text-slate-500">收入延期</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-red-400">{expenseDuplicates.length}</p>
            <p className="text-xs text-slate-500">支出重复</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-yellow-400">{milestoneIssues.length}</p>
            <p className="text-xs text-slate-500">里程碑</p>
          </div>
          <div className="text-center p-2 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-purple-400">{budgetOverruns.length}</p>
            <p className="text-xs text-slate-500">预算超支</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {unresolvedRisks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无未解决的风险</p>
          </div>
        ) : (
          unresolvedRisks.map((risk) => (
            <RiskCard
              key={risk.id}
              risk={risk}
              isSelected={risk.id === selectedRiskId}
              onClick={() => selectRisk(risk.id === selectedRiskId ? null : risk.id)}
            />
          ))
        )}

        {resolvedRisks.length > 0 && (
          <>
            <div className="pt-4 mt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-2">
                已解决 ({resolvedRisks.length})
              </p>
              {resolvedRisks.map((risk) => (
                <RiskCard
                  key={risk.id}
                  risk={risk}
                  isSelected={risk.id === selectedRiskId}
                  onClick={() => selectRisk(risk.id === selectedRiskId ? null : risk.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
