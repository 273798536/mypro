import { AlertTriangle, Radio, Database, AlertOctagon, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useReviewStore } from '@/store/useReviewStore';
import { useSampleStore } from '@/store/useSampleStore';
import { RISK_TYPE_LABELS, RiskType, RiskLevel } from '@/types';
import { getRiskColor } from '@/utils/colorUtils';

function RiskIcon({ type }: { type: RiskType }) {
  if (type === 'buoy_offline') return <Radio size={14} />;
  if (type === 'water_missing') return <Database size={14} />;
  return <AlertOctagon size={14} />;
}

export default function RiskList() {
  const { risks, resolveRisk } = useReviewStore();
  const { selectSample } = useSampleStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unresolvedRisks = risks.filter((r) => !r.isResolved);
  const resolvedRisks = risks.filter((r) => r.isResolved);

  const renderRiskCard = (r: any) => {
    const isExpanded = expandedId === r.id;
    return (
      <div
        key={r.id}
        className={`rounded-lg border transition-all ${
          r.isResolved
            ? 'bg-ocean-900/30 border-ocean-800 opacity-70'
            : 'bg-ocean-900/60'
        }`}
        style={{ borderColor: r.isResolved ? undefined : `${getRiskColor(r.level as RiskLevel)}40` }}
      >
        <div
          className="p-3 cursor-pointer"
          onClick={() => setExpandedId(isExpanded ? null : r.id)}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${getRiskColor(r.level as RiskLevel)}20`,
                color: getRiskColor(r.level as RiskLevel),
              }}
            >
              <RiskIcon type={r.type as RiskType} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`badge-risk-${r.level}`}>{RISK_TYPE_LABELS[r.type as RiskType]}</span>
                <span className={`badge-risk-${r.level}`}>
                  {r.level === 'high' ? '高风险' : r.level === 'medium' ? '中风险' : '低风险'}
                </span>
                {r.isResolved && (
                  <span className="badge-risk-none">已处理</span>
                )}
                {isExpanded ? (
                  <ChevronUp size={12} className="ml-auto text-ocean-400" />
                ) : (
                  <ChevronDown size={12} className="ml-auto text-ocean-400" />
                )}
              </div>
              <p className="text-xs text-ocean-200 leading-snug line-clamp-2">{r.description}</p>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t border-ocean-800/50">
            <div className="mt-2 space-y-2">
              <div className="bg-ocean-950/50 rounded-md p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-cyan-glow mb-1">
                  <AlertTriangle size={10} /> 处理建议
                </div>
                <p className="text-[11px] text-ocean-200 leading-relaxed">{r.suggestion}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectSample(r.sampleId);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-ocean-800/50 text-ocean-200 hover:bg-ocean-800 border border-ocean-700 transition-colors"
                >
                  定位样本
                </button>
                {!r.isResolved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resolveRisk(r.id);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-cyan-glow/15 text-cyan-glow hover:bg-cyan-glow/25 border border-cyan-glow/30 transition-colors flex items-center gap-1"
                  >
                    <Check size={10} /> 标记已处理
                  </button>
                )}
                <span className="ml-auto text-[10px] text-ocean-500">{r.createdAt}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-crimson-risk/20 flex items-center justify-center">
            <AlertTriangle size={14} className="text-crimson-risk" />
          </div>
          <span className="font-display font-semibold text-ocean-50 text-sm">风险通报</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="px-1.5 py-0.5 rounded bg-crimson-risk/20 text-crimson-risk font-semibold">
            {unresolvedRisks.length}
          </span>
          <span className="text-ocean-400">待处理</span>
        </div>
      </div>

      <div className="divider-glow mb-3" />

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {unresolvedRisks.length > 0 && (
          <div>
            <div className="text-[11px] text-ocean-400 mb-2 uppercase tracking-wider">待处理</div>
            <div className="space-y-2">{unresolvedRisks.map(renderRiskCard)}</div>
          </div>
        )}
        {resolvedRisks.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] text-ocean-500 mb-2 uppercase tracking-wider">已处理</div>
            <div className="space-y-2">{resolvedRisks.map(renderRiskCard)}</div>
          </div>
        )}
        {risks.length === 0 && (
          <div className="text-center py-8 text-ocean-500">
            <Check size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">暂无风险通报</p>
          </div>
        )}
      </div>
    </div>
  );
}
