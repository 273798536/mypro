import { ShieldAlert, AlertTriangle, FileWarning, Link2 } from 'lucide-react';
import type { RiskIssue } from '../../../shared/types';
import { RISK_ISSUE_LABELS } from '../../../shared/types';

interface RiskIssueCardProps {
  issue: RiskIssue;
}

const issueIcons = {
  risk_misalignment: ShieldAlert,
  maturity_missing: FileWarning,
  yield_exaggeration: AlertTriangle,
};

export function RiskIssueCard({ issue }: RiskIssueCardProps) {
  const Icon = issueIcons[issue.type];
  const isCritical = issue.severity === 'critical';

  return (
    <div
      className={`p-4 rounded-lg border ${
        isCritical
          ? 'bg-risk-500/10 border-risk-500/30 risk-glow'
          : 'bg-warning-500/10 border-warning-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg flex-shrink-0 ${
            isCritical ? 'bg-risk-500/20' : 'bg-warning-500/20'
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              isCritical ? 'text-risk-400' : 'text-warning-400'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                isCritical
                  ? 'bg-risk-500/20 text-risk-400'
                  : 'bg-warning-500/20 text-warning-400'
              }`}
            >
              {isCritical ? '严重' : '警告'}
            </span>
            <span className="text-sm font-medium text-white">
              {RISK_ISSUE_LABELS[issue.type]}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {issue.description}
          </p>
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-1">问题对象</div>
            <code className="text-xs text-cyber-400 bg-space-700 px-2 py-1 rounded block">
              {issue.targetObject}
            </code>
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              材料来源
            </div>
            <div className="flex flex-wrap gap-1">
              {issue.sourceMaterials.map((source, i) => (
                <span
                  key={i}
                  className="text-xs bg-space-700 text-gray-300 px-2 py-1 rounded font-mono"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            检测时间：{new Date(issue.detectedTime).toLocaleString('zh-CN')}
          </div>
        </div>
      </div>
    </div>
  );
}
