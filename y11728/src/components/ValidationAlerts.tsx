import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, X, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { useRideStore } from '@/store/useRideStore';
import { ValidationIssue } from '@/types';

const ValidationAlerts: React.FC = () => {
  const { currentValidation, autoFixIssue } = useRideStore();
  const [expanded, setExpanded] = useState(true);

  if (!currentValidation || (currentValidation.errors.length === 0 && currentValidation.warnings.length === 0)) {
    return null;
  }

  const totalIssues = currentValidation.errors.length + currentValidation.warnings.length;

  return (
    <div className="card overflow-hidden animate-slide-in">
      <div 
        className="card-header flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {currentValidation.errors.length > 0 ? (
            <div className="p-2 bg-error-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-error-500" />
            </div>
          ) : (
            <div className="p-2 bg-warning-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning-500" />
            </div>
          )}
          <div>
            <h3 className="font-semibold">
              发现 {totalIssues} 个数据问题
            </h3>
            <p className="text-sm text-dark-400">
              {currentValidation.errors.length} 个错误，{currentValidation.warnings.length} 个警告
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!currentValidation.isValid && (
            <span className="badge-error">无法计算</span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-dark-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-dark-500" />
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="card-body space-y-3">
          {currentValidation.errors.map((issue) => (
            <IssueCard key={issue.id} issue={issue} type="error" onFix={autoFixIssue} />
          ))}
          {currentValidation.warnings.map((issue) => (
            <IssueCard key={issue.id} issue={issue} type="warning" onFix={autoFixIssue} />
          ))}
        </div>
      )}
    </div>
  );
};

interface IssueCardProps {
  issue: ValidationIssue;
  type: 'error' | 'warning';
  onFix: (field: any, value: any) => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, type, onFix }) => {
  const isError = type === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;
  const badgeClass = isError ? 'badge-error' : 'badge-warning';
  const bgClass = isError ? 'bg-error-500/10 border-error-500/30' : 'bg-warning-500/10 border-warning-500/30';

  return (
    <div className={`p-4 rounded-lg border ${bgClass} transition-all hover:scale-[1.01]`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isError ? 'text-error-500' : 'text-warning-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${badgeClass} text-xs`}>
              {isError ? '错误' : '警告'}
            </span>
            <span className="text-xs text-dark-500 font-mono">
              {issue.code}
            </span>
          </div>
          <p className="text-dark-200 font-medium">{issue.message}</p>
          <p className="text-sm text-dark-400 mt-1">{issue.suggestion}</p>
          
          {issue.autoFix && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const field = Object.keys(issue.autoFix!)[0] as any;
                const value = issue.autoFix![field];
                onFix(field, value);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-md text-sm text-dark-200 hover:text-white transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              一键修复
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationAlerts;
