import { CheckCircle, AlertTriangle, XCircle, Clock, User, MapPin } from 'lucide-react';
import type { CheckResult } from '../types';
import { SampleTypeBadge, AssignmentStatusBadge, SeverityBadge } from './StatusBadge';

interface CheckResultCardProps {
  result: CheckResult;
  highlight?: boolean;
  showOldResult?: CheckResult | null;
}

const sampleIconMap = {
  normal: CheckCircle,
  boundary: AlertTriangle,
  bad: XCircle,
};

const sampleColorMap = {
  normal: 'text-forest-600',
  boundary: 'text-amber-600',
  bad: 'text-wine-600',
};

export function CheckResultCard({ result, highlight, showOldResult }: CheckResultCardProps) {
  const Icon = sampleIconMap[result.sampleType];
  const colorClass = sampleColorMap[result.sampleType];
  
  const hasChanges = showOldResult && (
    showOldResult.sampleType !== result.sampleType ||
    showOldResult.assignment.status !== result.assignment.status ||
    JSON.stringify(showOldResult.issues) !== JSON.stringify(result.issues)
  );
  
  return (
    <div 
      className={`card p-4 transition-all duration-300 ${
        highlight ? 'ring-2 ring-navy-500 ring-offset-2' : ''
      } ${hasChanges ? 'animate-pulse-once' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-medium text-navy-900">
              {result.volunteer.name}
            </h4>
            <p className="text-sm text-navy-500">
              {result.volunteer.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SampleTypeBadge type={result.sampleType} />
          <AssignmentStatusBadge status={result.assignment.status} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="flex items-center gap-2 text-navy-600">
          <MapPin className="w-4 h-4" />
          <span>{result.position.name}</span>
        </div>
        <div className="flex items-center gap-2 text-navy-600">
          <Clock className="w-4 h-4" />
          <span>{result.position.timeSlot}</span>
        </div>
      </div>
      
      {result.issues.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-navy-100">
          <p className="text-xs font-medium text-navy-600 mb-2">检查问题：</p>
          {result.issues.map((issue, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <SeverityBadge severity={issue.severity} />
              <div>
                <p className="text-sm text-navy-800">{issue.message}</p>
                {issue.details && (
                  <p className="text-xs text-navy-500">{issue.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showOldResult && hasChanges && (
        <div className="mt-4 pt-4 border-t border-navy-200 bg-navy-50/50 -mx-4 -mb-4 px-4 pb-4 rounded-b">
          <p className="text-xs font-medium text-navy-600 mb-2">变更前状态：</p>
          <div className="flex items-center gap-2 mb-2">
            <SampleTypeBadge type={showOldResult.sampleType} />
            <AssignmentStatusBadge status={showOldResult.assignment.status} />
          </div>
          {showOldResult.issues.length > 0 && (
            <p className="text-sm text-navy-600">
              原问题: {showOldResult.issues.map(i => i.message).join('；')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
