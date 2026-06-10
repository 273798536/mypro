import { CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import type { ResultStatus } from '@/types';

interface ResultBadgeProps {
  status: ResultStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ResultStatus, {
  label: string;
  icon: typeof CheckCircle;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}> = {
  PASS: {
    label: '可直接使用',
    icon: CheckCircle,
    bgClass: 'bg-status-passBg',
    textClass: 'text-status-pass',
    borderClass: 'border-status-pass/20',
    dotClass: 'bg-status-pass',
  },
  REVIEW: {
    label: '需管理员复核',
    icon: AlertTriangle,
    bgClass: 'bg-status-reviewBg',
    textClass: 'text-status-review',
    borderClass: 'border-status-review/20',
    dotClass: 'bg-status-review',
  },
  FAIL: {
    label: '计算失败',
    icon: XCircle,
    bgClass: 'bg-status-failBg',
    textClass: 'text-status-fail',
    borderClass: 'border-status-fail/20',
    dotClass: 'bg-status-fail',
  },
};

export function ResultBadge({ status, size = 'md' }: ResultBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full font-medium ${config.bgClass} ${config.textClass} border ${config.borderClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} ${size === 'sm' ? '' : 'animate-pulse'}`} />
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}

interface ResultCardProps {
  status: ResultStatus;
  waterContent: number;
  unit: string;
  formula: string;
  formulaDetail: string;
  sourceTrace: string;
  safetyTip: string;
  failureReason?: string;
  retestAdvice?: string;
  blankFallback: boolean;
  blankFallbackValue?: number;
  applicableRange: string;
  calculatedAt: string;
  parallelDeviation?: number;
  onExport?: () => void;
  onRetest?: () => void;
}

const cardStyles: Record<ResultStatus, {
  topBar: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
}> = {
  PASS: {
    topBar: 'bg-gradient-to-r from-status-pass via-emerald-400 to-status-pass',
    accentBg: 'bg-status-passBg',
    accentText: 'text-status-pass',
    accentBorder: 'border-status-pass/20',
  },
  REVIEW: {
    topBar: 'bg-gradient-to-r from-status-review via-amber-400 to-status-review',
    accentBg: 'bg-status-reviewBg',
    accentText: 'text-status-review',
    accentBorder: 'border-status-review/20',
  },
  FAIL: {
    topBar: 'bg-gradient-to-r from-status-fail via-rose-400 to-status-fail',
    accentBg: 'bg-status-failBg',
    accentText: 'text-status-fail',
    accentBorder: 'border-status-fail/20',
  },
};

export function ResultCard(props: ResultCardProps) {
  const style = cardStyles[props.status];
  const config = statusConfig[props.status];
  const StatusIcon = config.icon;

  return (
    <div id="result-card" className="card overflow-hidden">
      <div className={`h-1.5 ${style.topBar}`} />
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${style.accentBg} flex items-center justify-center`}>
              <StatusIcon className={`w-6 h-6 ${style.accentText}`} strokeWidth={2.2} />
            </div>
            <div>
              <ResultBadge status={props.status} />
              <p className="mt-1 text-xs text-slate-400">
                计算时间：{new Date(props.calculatedAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>

        <div className={`p-5 rounded-xl ${style.accentBg} border ${style.accentBorder} mb-6`}>
          <p className={`text-xs font-medium ${style.accentText} mb-1.5 uppercase tracking-wider`}>
            晶体水含量
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-serif font-bold ${style.accentText}`}>
              {props.waterContent.toFixed(4)}
            </span>
            <span className={`text-2xl font-medium ${style.accentText}`}>{props.unit}</span>
          </div>
          {props.parallelDeviation !== undefined && (
            <p className="mt-2 text-xs text-slate-500">
              平行样偏差：{props.parallelDeviation.toFixed(4)}%
              {props.parallelDeviation > 0.5 && (
                <span className="ml-2 text-status-fail font-medium">（超阈值 0.5%）</span>
              )}
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="w-1 h-4 rounded-full bg-primary-500" />
              计算公式说明
            </h4>
            <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm">
              <div className="text-slate-600 mb-2">通用公式：</div>
              <div className="text-primary-900 font-medium text-base">{props.formula}</div>
              <div className="border-t border-slate-200 my-3" />
              <div className="text-slate-600 mb-1">代入计算：</div>
              <div className="text-primary-800 font-medium break-all">{props.formulaDetail}</div>
            </div>
            <div className="mt-3 flex gap-4 text-xs">
              <div>
                <span className="text-slate-400">适用范围：</span>
                <span className="text-slate-600 font-medium">{props.applicableRange}</span>
              </div>
              {props.blankFallback && (
                <div>
                  <span className="text-status-review font-medium">空白对照降级：</span>
                  <span className="text-slate-600 font-medium">
                    使用均值 {props.blankFallbackValue?.toFixed(6) || '—'} g
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="w-1 h-4 rounded-full bg-primary-500" />
              来源材料追溯
            </h4>
            <p className="text-sm text-slate-600 bg-slate-50 px-4 py-2.5 rounded-lg">
              {props.sourceTrace}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <span className="w-1 h-4 rounded-full bg-status-pass" />
              安全提示
            </h4>
            <p className="text-sm text-slate-600 bg-status-passBg border border-status-pass/10 px-4 py-2.5 rounded-lg">
              {props.safetyTip}
            </p>
          </div>

          {props.failureReason && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-4 rounded-full bg-status-fail" />
                失败原因分析
              </h4>
              <p className="text-sm text-status-fail bg-status-failBg border border-status-fail/10 px-4 py-2.5 rounded-lg">
                {props.failureReason}
              </p>
            </div>
          )}

          {props.retestAdvice && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-4 rounded-full bg-status-review" />
                复测建议（关联来源材料）
              </h4>
              <div className="text-sm text-slate-700 bg-status-reviewBg border border-status-review/10 px-4 py-3 rounded-lg space-y-1.5 whitespace-pre-line">
                {props.retestAdvice}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
          {props.onRetest && (
            <button className="btn-secondary flex items-center gap-2" onClick={props.onRetest}>
              <ArrowRight className="w-4 h-4" />
              申请复测
            </button>
          )}
          {props.onExport && (
            <button className="btn-primary flex items-center gap-2" onClick={props.onExport}>
              导出报告
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
