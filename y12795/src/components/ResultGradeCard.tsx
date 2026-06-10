import { CheckCircle2, AlertCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ResultGrade } from '@/types';

interface ResultGradeCardProps {
  grade: ResultGrade;
  title: string;
  value?: string;
  unit?: string;
  primaryReason: string;
  suggestions: string[];
  actions?: Array<{ label: string; priority: 'high' | 'medium' | 'low' }>;
}

const gradeConfig: Record<ResultGrade, {
  bgClass: string; iconBg: string; icon: typeof CheckCircle2; label: string;
}> = {
  '通过': {
    bgClass: 'grade-pass',
    iconBg: 'bg-lab-green text-white',
    icon: CheckCircle2,
    label: '可直接使用',
  },
  '建议复测': {
    bgClass: 'grade-retest',
    iconBg: 'bg-lab-amber text-white',
    icon: AlertTriangle,
    label: '建议复测',
  },
  '必须复核': {
    bgClass: 'grade-review',
    iconBg: 'bg-lab-red text-white',
    icon: AlertCircle,
    label: '需药化研究员复核',
  },
};

export function ResultGradeCard({
  grade, title, value, unit, primaryReason, suggestions, actions = [],
}: ResultGradeCardProps) {
  const config = gradeConfig[grade];
  const Icon = config.icon;

  return (
    <div className={`${config.bgClass} p-5 rounded-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center`}>
              <Icon size={20} />
            </div>
            <h3 className="font-serif text-lg font-semibold">{title}</h3>
          </div>
          <p className="text-xs opacity-75">{config.label}</p>
        </div>
        {value && (
          <div className="text-right">
            <div className="font-mono text-2xl font-semibold">{value}</div>
            {unit && <div className="text-xs opacity-75">{unit}</div>}
          </div>
        )}
      </div>

      <div className="bg-white/60 rounded-sm p-3 mb-3">
        <p className="text-sm font-medium mb-2">{primaryReason}</p>
        {suggestions.length > 0 && (
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-xs flex items-start gap-2 opacity-80">
                <span className="mt-1 w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {actions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium opacity-75">建议操作：</p>
          {actions.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm bg-white/70 px-3 py-2 rounded-sm
                ${a.priority === 'high' ? 'border-l-4 border-current' : ''}`}
            >
              <ArrowRight size={14} className="opacity-60" />
              <span>{a.label}</span>
              {a.priority === 'high' && (
                <span className="ml-auto text-xs font-medium px-1.5 py-0.5 bg-current/10 rounded">优先</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
