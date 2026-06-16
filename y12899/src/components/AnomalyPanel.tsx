import { AlertTriangle, FileWarning, Settings2, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Anomaly, AnomalyCategory, AnomalySeverity } from '../types';

interface AnomalyCardProps {
  anomaly: Anomaly;
  onResolve?: (id: string) => void;
  onAddSupplement?: (id: string, material: string) => void;
  onAdjustCaliber?: (id: string, adjustment: string) => void;
  className?: string;
}

const categoryConfig: Record<AnomalyCategory, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  actionLabel: string;
}> = {
  supplement_material: {
    label: '需补材料',
    icon: <FileWarning size={16} />,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    actionLabel: '补充材料',
  },
  adjust_caliber: {
    label: '需改口径',
    icon: <Settings2 size={16} />,
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    actionLabel: '调整口径',
  },
};

const severityConfig: Record<AnomalySeverity, {
  label: string;
  dotColor: string;
}> = {
  low: { label: '低', dotColor: 'bg-emerald-500' },
  medium: { label: '中', dotColor: 'bg-amber-500' },
  high: { label: '高', dotColor: 'bg-rose-500' },
};

export function AnomalyCard({
  anomaly,
  onResolve,
  onAddSupplement,
  onAdjustCaliber,
  className,
}: AnomalyCardProps) {
  const config = categoryConfig[anomaly.category];
  const severity = severityConfig[anomaly.severity];

  const handleAction = () => {
    if (anomaly.category === 'supplement_material' && onAddSupplement) {
      const material = prompt('请输入补充的材料内容：');
      if (material) {
        onAddSupplement(anomaly.id, material);
      }
    } else if (anomaly.category === 'adjust_caliber' && onAdjustCaliber) {
      const adjustment = prompt('请输入口径调整说明：');
      if (adjustment) {
        onAdjustCaliber(anomaly.id, adjustment);
      }
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all duration-200 hover:shadow-md',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            anomaly.category === 'supplement_material' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
          )}>
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                anomaly.category === 'supplement_material' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
              )}>
                {config.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <span className={cn('h-2 w-2 rounded-full', severity.dotColor)} />
                {severity.label}优先级
              </span>
            </div>
            <h4 className="mt-1 font-medium text-slate-800">{anomaly.title}</h4>
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{anomaly.description}</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Clock size={14} className="text-slate-400" />
              <span className="text-slate-500">来源：{anomaly.sourceModule}</span>
            </div>
            <div className="mt-2 p-2 rounded bg-white/60 border border-slate-200">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium text-slate-600">下一步：</span>
                  <span className="text-xs text-slate-700">{anomaly.nextAction}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleAction}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            anomaly.category === 'supplement_material'
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-sky-500 text-white hover:bg-sky-600'
          )}
        >
          {config.actionLabel}
        </button>
        {onResolve && (
          <button
            onClick={() => onResolve(anomaly.id)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 flex items-center gap-1"
          >
            <CheckCircle2 size={14} />
            标记已处理
          </button>
        )}
      </div>
    </div>
  );
}

interface AnomalyPanelProps {
  anomalies: Anomaly[];
  onAddSupplement?: (id: string, material: string) => void;
  onAdjustCaliber?: (id: string, adjustment: string) => void;
  onResolve?: (id: string) => void;
}

export function AnomalyPanel({ anomalies, onAddSupplement, onAdjustCaliber, onResolve }: AnomalyPanelProps) {
  const supplementAnomalies = anomalies.filter(a => a.category === 'supplement_material');
  const adjustAnomalies = anomalies.filter(a => a.category === 'adjust_caliber');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">异常分类处理</h3>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            需补材料：{supplementAnomalies.length} 项
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            需改口径：{adjustAnomalies.length} 项
          </span>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
          <p className="mt-2 text-slate-500">暂无异常，继续保持</p>
        </div>
      ) : (
        <div className="space-y-4">
          {supplementAnomalies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <FileWarning size={16} />
                需要补充材料
              </h4>
              {supplementAnomalies.map(anomaly => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  onResolve={onResolve}
                  onAddSupplement={onAddSupplement}
                />
              ))}
            </div>
          )}

          {adjustAnomalies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-sky-700 flex items-center gap-2">
                <Settings2 size={16} />
                需要调整口径
              </h4>
              {adjustAnomalies.map(anomaly => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  onResolve={onResolve}
                  onAdjustCaliber={onAdjustCaliber}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
