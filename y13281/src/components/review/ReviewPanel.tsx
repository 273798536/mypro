import {
  CheckCircle2,
  XCircle,
  User,
  Clock,
  Volume2,
  Gauge,
} from 'lucide-react';
import { useAppStore, usePointReviews } from '../../store/useAppStore';
import { getNoiseColor } from '../../mock/data';
import type { ReviewRecord } from '../../types';
import { OverlimitAlert } from './OverlimitAlert';
import { cn } from '../../lib/utils';

function StatusBadge({ status }: { status: ReviewRecord['status'] }) {
  const config = {
    pending: {
      label: '待复核',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    confirmed: {
      label: '已确认通过',
      className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    rejected: {
      label: '已驳回补证',
      className: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
  };

  const cfg = config[status];
  const Icon = status === 'confirmed' ? CheckCircle2 : status === 'rejected' ? XCircle : Clock;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
        cfg.className
      )}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function CapacityProgressBar({ measuredValue, noiseCapacity }: { measuredValue: number; noiseCapacity: number }) {
  const percentage = Math.min((measuredValue / noiseCapacity) * 100, 120);
  const color = getNoiseColor(measuredValue, noiseCapacity);
  const isOverLimit = measuredValue > noiseCapacity;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">容量利用率</span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color }}
        >
          {((measuredValue / noiseCapacity) * 100).toFixed(1)}%
          {isOverLimit && <span className="ml-1 text-rose-400">(超限)</span>}
        </span>
      </div>
      <div className="relative h-3 bg-slate-700/80 rounded-full overflow-hidden border border-slate-600">
        <div className="absolute inset-y-0 left-0 w-full opacity-20" style={{ background: `linear-gradient(to right, #38a169 0%, #38a169 80%, #d69e2e 80%, #d69e2e 100%)` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
        {percentage > 100 && (
          <div
            className="absolute inset-y-0 right-0 flex items-center justify-center pr-2"
            style={{ width: `${Math.min((percentage - 100) / 20 * 100, 100)}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
        )}
        <div className="absolute top-0 bottom-0 w-px bg-slate-500/50" style={{ left: '80%' }} />
        <div className="absolute top-0 bottom-0 w-px bg-rose-500/60" style={{ left: '100%' }} />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        <span>0%</span>
        <span className="text-amber-500/70">80%</span>
        <span className="text-rose-500/70">100%</span>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewRecord }) {
  const { confirmReview } = useAppStore();
  const isDone = review.status === 'confirmed' || review.status === 'rejected';

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-300',
        review.isOverLimit
          ? 'bg-gradient-to-br from-rose-500/8 via-slate-800/90 to-slate-800/90 border-rose-500/20'
          : 'bg-slate-800/90 border-slate-700'
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center border',
                review.isOverLimit
                  ? 'bg-rose-500/20 border-rose-500/40'
                  : 'bg-emerald-500/20 border-emerald-500/40'
              )}
            >
              {review.isOverLimit ? (
                <XCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                {review.isOverLimit ? '噪声超限预警' : '噪声容量正常'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {review.timePeriod === 'morning' ? '早高峰' : '晚高峰'}时段检测
              </p>
            </div>
          </div>
          <StatusBadge status={review.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-400">测量值</span>
            </div>
            <div
              className="text-xl font-mono font-bold"
              style={{ color: getNoiseColor(review.measuredValue, review.noiseCapacity) }}
            >
              {review.measuredValue}
              <span className="text-sm font-normal text-slate-400 ml-0.5">dB</span>
            </div>
          </div>

          <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Gauge className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-slate-400">噪声容量</span>
            </div>
            <div className="text-xl font-mono font-bold text-slate-100">
              {review.noiseCapacity}
              <span className="text-sm font-normal text-slate-400 ml-0.5">dB</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <CapacityProgressBar
            measuredValue={review.measuredValue}
            noiseCapacity={review.noiseCapacity}
          />
        </div>

        {review.needManualConfirm && (
          <div className="mb-4">
            <OverlimitAlert
              confirmReason={review.confirmReason}
              nextStep={review.nextStep}
            />
          </div>
        )}

        {isDone && (
          <div className="mb-4 bg-slate-700/40 rounded-lg p-4 border border-slate-600/50">
            <div className="text-xs font-semibold text-slate-400 mb-3 pb-2 border-b border-slate-600/50">
              操作记录
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">操作人：</span>
                <span className="text-slate-200 font-medium">{review.reviewedBy}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">操作时间：</span>
                <span className="text-slate-200 font-medium">{review.reviewedAt}</span>
              </div>
            </div>
          </div>
        )}

        {!isDone && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => confirmReview(review.id, true)}
              className="
                flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-gradient-to-r from-emerald-500 to-green-500 text-white
                font-semibold text-sm shadow-lg shadow-emerald-500/25
                hover:shadow-emerald-500/40 hover:scale-[1.02]
                active:scale-[0.98] transition-all duration-200
                border border-emerald-400/30
              "
            >
              <CheckCircle2 className="w-4 h-4" />
              确认通过
            </button>

            <button
              onClick={() => confirmReview(review.id, false)}
              className="
                flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                bg-gradient-to-r from-rose-500 to-red-500 text-white
                font-semibold text-sm shadow-lg shadow-rose-500/25
                hover:shadow-rose-500/40 hover:scale-[1.02]
                active:scale-[0.98] transition-all duration-200
                border border-rose-400/30
              "
            >
              <XCircle className="w-4 h-4" />
              驳回补证
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewPanel() {
  const { selectedPointId } = useAppStore();
  const reviews = usePointReviews(selectedPointId);
  const { monitorPoints } = useAppStore();
  const selectedPoint = monitorPoints.find((p) => p.id === selectedPointId);

  if (!selectedPointId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4 border border-slate-600/50">
          <Gauge className="w-10 h-10 text-slate-500" />
        </div>
        <h3 className="text-slate-300 font-medium text-base mb-2">请选择监测点查看复核详情</h3>
        <p className="text-slate-500 text-sm text-center max-w-xs">
          在地图或列表中点击任意监测点，即可查看该点位的容量复核记录和处理状态
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-slate-700/80 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-100 font-semibold text-base flex items-center gap-2">
              <Gauge className="w-4 h-4 text-violet-400" />
              容量复核面板
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              当前监测点：<span className="text-slate-200 font-medium">{selectedPoint?.name}</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-slate-400">共 {reviews.length} 条复核记录</span>
            </p>
          </div>
          {reviews.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
              {reviews.filter((r) => r.status === 'pending').length} 待处理
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/40 flex items-center justify-center mb-4 border border-slate-600/50">
              <Clock className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-slate-400 font-medium text-sm mb-1">暂无复核记录</h3>
            <p className="text-slate-500 text-xs">该监测点当前时段暂无复核数据</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
