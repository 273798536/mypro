import { FileText, GitCompare, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { compareConclusions, formatDate } from '../../utils/helpers';

export function ConclusionComparisonPanel() {
  const { conclusions, showConclusionDiff, toggleConclusionDiff, oldParameters, parameters } = useAppStore();

  const oldConclusion = conclusions.find(c => c.superseded) || null;
  const newConclusion = conclusions.find(c => !c.superseded) || null;
  const diff = compareConclusions(oldConclusion, newConclusion);

  const riskColors: Record<string, string> = {
    low: 'bg-success/20 text-success border-success/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    high: 'bg-danger/20 text-danger border-danger/30',
  };

  const riskLabels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };

  const getFieldDiffIcon = (field: string, before: any, after: any) => {
    if (typeof before === 'number' && typeof after === 'number') {
      if (after > before) return <TrendingUp size={14} className="text-warning" />;
      if (after < before) return <TrendingDown size={14} className="text-success" />;
      return <Minus size={14} className="text-text-muted" />;
    }
    return <GitCompare size={14} className="text-info" />;
  };

  const fieldLabels: Record<string, string> = {
    averageThickness: '平均厚度(m)',
    maxThickness: '最大厚度(m)',
    minThickness: '最小厚度(m)',
    outlierCount: '离群点数量',
    riskLevel: '风险等级',
    content: '分析结论',
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between cursor-pointer" onClick={toggleConclusionDiff}>
        <div className="flex items-center gap-2">
          <GitCompare size={18} className="text-ice-blue" />
          <h3 className="font-display text-lg text-gradient">结论对比</h3>
          {diff.changes.length > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full border ${
              diff.severity === 'critical' ? 'bg-danger/20 text-danger border-danger/30'
                : diff.severity === 'major' ? 'bg-warning/20 text-warning border-warning/30'
                : 'bg-info/20 text-info border-info/30'
            }`}>
              {diff.changes.length}项差异
            </span>
          )}
        </div>
        {showConclusionDiff ? (
          <ChevronUpIcon />
        ) : (
          <ChevronDownIcon />
        )}
      </div>

      {showConclusionDiff && oldConclusion && newConclusion && (
        <div className="animate-slide-in space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ConclusionCard
              title="旧结论"
              version={`v${oldConclusion.version}`}
              conclusion={oldConclusion}
              riskColors={riskColors}
              riskLabels={riskLabels}
              isOld
            />
            <ConclusionCard
              title="新结论"
              version={`v${newConclusion.version}`}
              conclusion={newConclusion}
              riskColors={riskColors}
              riskLabels={riskLabels}
              isOld={false}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-text-primary flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              差异详情（影响范围分析）
            </div>
            <div className="space-y-2">
              {diff.changes.map((change, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-bg-tertiary/40 border border-ice-blue/10"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getFieldDiffIcon(change.field, change.before, change.after)}
                    <span className="font-medium text-sm text-text-primary">
                      {fieldLabels[change.field] || change.field}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <div className="text-xs">
                      <div className="text-text-muted mb-1">v{oldConclusion.version}</div>
                      <div className="p-2 rounded bg-danger/10 text-danger text-sm line-through">
                        {change.field === 'riskLevel' ? riskLabels[change.before as string] : String(change.before)}
                      </div>
                    </div>
                    <div className="text-ice-blue">→</div>
                    <div className="text-xs">
                      <div className="text-text-muted mb-1">v{newConclusion.version}</div>
                      <div className="p-2 rounded bg-success/10 text-success text-sm font-medium animate-value-change">
                        {change.field === 'riskLevel' ? riskLabels[change.after as string] : String(change.after)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-ice-blue/20 space-y-2">
            <div className="text-xs text-text-muted">
              影响测点: {diff.affectedPoints.map(p => p.split('-')[1]).join(', #')}
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              <CheckCircle size={12} className="text-success" />
              参数变更关联: Sigma阈值 {oldParameters.sigmaThreshold} → {parameters.sigmaThreshold}，置信度 {oldParameters.minConfidence} → {parameters.minConfidence}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronUpIcon() {
  return <ChevronIcon up />;
}

function ChevronDownIcon() {
  return <ChevronIcon up={false} />;
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: up ? 'none' : 'rotate(180deg)' }}
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ConclusionCard({
  title,
  version,
  conclusion,
  riskColors,
  riskLabels,
  isOld,
}: {
  title: string;
  version: string;
  conclusion: any;
  riskColors: Record<string, string>;
  riskLabels: Record<string, string>;
  isOld: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${isOld ? 'bg-bg-tertiary/40 border border-danger/20' : 'bg-ice-blue/10 border border-ice-blue/30'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className={isOld ? 'text-danger' : 'text-ice-blue'} />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="text-xs font-mono text-text-muted">{version}</span>
      </div>
      <div className="text-xs text-text-muted mb-1">
        {conclusion.author.name} · {formatDate(conclusion.timestamp)}
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
        <div>平均: <span className="text-text-primary">{conclusion.averageThickness.toFixed(2)}m</span></div>
        <div>最大: <span className="text-text-primary">{conclusion.maxThickness.toFixed(2)}m</span></div>
        <div>最小: <span className="text-text-primary">{conclusion.minThickness.toFixed(2)}m</span></div>
        <div>离群: <span className="text-danger">{conclusion.outlierCount}</span></div>
      </div>
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${riskColors[conclusion.riskLevel]}`}>
        {riskLabels[conclusion.riskLevel]}
      </span>
    </div>
  );
}
