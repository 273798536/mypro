import { Calculator, FileText, Clock } from 'lucide-react';
import type { VestingSchedule, VestingPlan, Grant } from '../../../shared/types';
import { formatDate, getVestingStatusText, getStatusBadgeClass } from '../../utils/format';
import { StatusBadge } from '../common/StatusBadge';

interface CalculationTraceProps {
  schedule: VestingSchedule;
  plan: VestingPlan;
  grant: Grant;
}

export function CalculationTrace({ schedule, plan, grant }: CalculationTraceProps) {
  const getRowHighlight = () => {
    if (schedule.isAccelerated) return 'highlight-acceleration';
    if (schedule.status === 'expired') return 'highlight-expired';
    if (schedule.status === 'forfeited') return 'highlight-forfeited';
    return '';
  };

  const monthlyShares = Math.floor(grant.totalShares / plan.totalMonths);
  const cliffShares = monthlyShares * plan.cliffMonths;

  return (
    <div className={`${getRowHighlight()} rounded-lg p-4 border border-slate-200`}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-lg font-mono font-bold text-slate-900">
              {formatDate(schedule.vestDate)}
            </div>
            <StatusBadge
              status={schedule.status}
              text={getVestingStatusText(schedule.status)}
            />
            {schedule.isAccelerated && (
              <span className="text-xs text-warning-700 bg-warning-100 px-2 py-0.5 rounded font-medium">
                ⚡ 加速归属
              </span>
            )}
            {schedule.status === 'expired' && (
              <span className="text-xs text-danger-700 bg-danger-100 px-2 py-0.5 rounded font-medium">
                窗口已过期
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">本期归属</div>
              <div className={`text-xl font-mono font-bold ${schedule.status === 'forfeited' || schedule.status === 'expired' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {schedule.vestedShares.toLocaleString()} 股
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">累计归属</div>
              <div className="text-xl font-mono font-bold text-primary-700">
                {schedule.cumulativeShares.toLocaleString()} 股
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">行权截止</div>
              <div className={`text-sm font-mono ${schedule.status === 'expired' ? 'text-danger-600 line-through' : 'text-slate-700'}`}>
                {schedule.exerciseDeadline ? formatDate(schedule.exerciseDeadline) : '—'}
              </div>
            </div>
          </div>

          <div className="bg-white/60 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <Calculator size={16} className="text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-slate-700 mb-1">计算过程</div>
                <div className="text-slate-600">{schedule.calculationNote}</div>
              </div>
            </div>

            {schedule.accelerationReason && (
              <div className="flex items-start gap-2 text-sm bg-warning-50 rounded-lg p-3">
                <Clock size={16} className="text-warning-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-warning-800 mb-1">加速规则</div>
                  <div className="text-warning-700">{schedule.accelerationReason}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-sm border-t border-slate-200 pt-3">
              <FileText size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-500">
                <span className="font-medium">归属公式：</span>
                授予总数 {grant.totalShares.toLocaleString()} 股 ÷ {plan.totalMonths} 个月 = 每月 {monthlyShares} 股
                {plan.cliffMonths > 0 && ` · 悬崖期 ${plan.cliffMonths} 个月 = ${cliffShares.toLocaleString()} 股`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
