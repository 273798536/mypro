import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Clock, User, MapPin } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import HudCard from '@/components/ui/HudCard';
import { formatTime } from '@/utils/storage';
import { cn } from '@/lib/utils';
import type { OutlierMark } from '@/types';

export default function OutlierPanel() {
  const outlierMarks = useGameStore((s) => s.outlierMarks);
  const currentPoints = useGameStore((s) => s.frames[s.currentFrame]?.points || []);
  const currentRole = useGameStore((s) => s.currentRole);
  const markOutlier = useGameStore((s) => s.markOutlier);
  const unmarkOutlier = useGameStore((s) => s.unmarkOutlier);
  const reviewOutlier = useGameStore((s) => s.reviewOutlier);
  const selectedPointId = useGameStore((s) => s.selectedPointId);
  const frames = useGameStore((s) => s.frames);
  const currentFrame = useGameStore((s) => s.currentFrame);
  const status = useGameStore((s) => s.status);

  const [reviewReason, setReviewReason] = useState<Record<string, string>>({});

  const visibleOutliers = currentPoints.filter((p) => p.isOutlier);
  const allDetected = frames[currentFrame] ? frames[currentFrame].points.filter(p => p.isOutlier) : [];

  const canMark = currentRole === 'operator' && (status === 'playing' || status === 'paused');
  const canReview = currentRole === 'reviewer' && (status === 'playing' || status === 'paused');

  const statusBadge = (status: OutlierMark['status']) => {
    switch (status) {
      case 'pending':
        return <span className="text-[9px] px-1.5 py-0.5 bg-warn-yellow/15 text-warn-yellow border border-warn-yellow/40 rounded clip-chamfer flex items-center gap-1"><Clock className="w-2 h-2" />待复核</span>;
      case 'approved':
        return <span className="text-[9px] px-1.5 py-0.5 bg-success-green/15 text-success-green border border-success-green/40 rounded clip-chamfer flex items-center gap-1"><CheckCircle className="w-2 h-2" />已通过</span>;
      case 'rejected':
        return <span className="text-[9px] px-1.5 py-0.5 bg-alert-orange/15 text-alert-orange border border-alert-orange/40 rounded clip-chamfer flex items-center gap-1"><XCircle className="w-2 h-2" />已驳回</span>;
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <HudCard title="离群点检测 · OUTLIERS" accent="orange" className="flex-shrink-0">
        <div className="grid grid-cols-3 gap-2 text-center mb-2">
          <div className="bg-space-dark/60 rounded p-1.5">
            <div className="text-[10px] font-mono text-alert-orange font-bold">{allDetected.length}</div>
            <div className="text-[8px] text-cyan-300/50">帧内离群</div>
          </div>
          <div className="bg-space-dark/60 rounded p-1.5">
            <div className="text-[10px] font-mono text-warn-yellow font-bold">
              {outlierMarks.filter(m => m.status === 'pending').length}
            </div>
            <div className="text-[8px] text-cyan-300/50">待复核</div>
          </div>
          <div className="bg-space-dark/60 rounded p-1.5">
            <div className="text-[10px] font-mono text-success-green font-bold">
              {outlierMarks.filter(m => m.status === 'approved').length}
            </div>
            <div className="text-[8px] text-cyan-300/50">已通过</div>
          </div>
        </div>

        {selectedPointId && canMark && (
          <button
            onClick={() => markOutlier(selectedPointId, '视口选中标记')}
            className="cyber-btn cyber-btn-danger w-full text-xs py-1.5 flex items-center justify-center gap-1.5"
          >
            <AlertCircle className="w-3 h-3" />
            将选中点标记为离群
          </button>
        )}
      </HudCard>

      <HudCard title="标记列表 · MARKS" accent="orange" className="flex-1 min-h-0 flex flex-col">
        {outlierMarks.length === 0 ? (
          <div className="text-[11px] text-cyan-300/50 text-center py-4">
            暂无标记 · 视口点击点后再点一次标记
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto scrollbar-cyber flex-1 pr-1">
            {outlierMarks.map((mark) => (
              <div
                key={mark.id}
                className={cn(
                  'p-2 rounded border text-[10px] font-mono space-y-1.5',
                  mark.status === 'approved' ? 'bg-success-green/5 border-success-green/20' :
                  mark.status === 'pending' ? 'bg-warn-yellow/5 border-warn-yellow/20' :
                  'bg-alert-orange/5 border-alert-orange/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300/80 truncate">
                    <MapPin className="w-2.5 h-2.5 inline mr-1 text-cyber-cyan" />
                    {mark.pointId.slice(-8)}
                  </span>
                  {statusBadge(mark.status)}
                </div>

                {mark.pointSnapshot && (
                  <div className="text-[9px] text-cyan-300/60 grid grid-cols-3 gap-1">
                    <span>X:{mark.pointSnapshot.x.toFixed(2)}</span>
                    <span>Y:{mark.pointSnapshot.y.toFixed(2)}</span>
                    <span>Z:{mark.pointSnapshot.z.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-[9px] text-cyan-300/50">
                  <User className="w-2 h-2" />
                  <span>{mark.markedBy}</span>
                  <span>·</span>
                  <span>{formatTime(mark.markedAt)}</span>
                </div>

                {mark.status === 'pending' && canReview && (
                  <div className="pt-1.5 space-y-1 border-t border-warn-yellow/10">
                    <input
                      type="text"
                      placeholder="复核原因..."
                      value={reviewReason[mark.id] || ''}
                      onChange={(e) => setReviewReason({ ...reviewReason, [mark.id]: e.target.value })}
                      className="w-full bg-space-dark/80 text-[10px] text-cyber-cyan px-1.5 py-1 border border-cyber-cyan/20 rounded focus:outline-none focus:border-cyber-cyan/50"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => reviewOutlier(mark.id, true, reviewReason[mark.id] || '复核通过')}
                        className="flex-1 cyber-btn cyber-btn-success text-[9px] py-1 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-2.5 h-2.5" />通过
                      </button>
                      <button
                        onClick={() => reviewOutlier(mark.id, false, reviewReason[mark.id] || '复核驳回')}
                        className="flex-1 cyber-btn cyber-btn-danger text-[9px] py-1 flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-2.5 h-2.5" />驳回
                      </button>
                    </div>
                  </div>
                )}

                {(mark.status === 'approved' || mark.status === 'rejected') && (
                  <div className="text-[9px] text-cyan-300/50 pt-1 border-t border-cyber-cyan/10">
                    <div className="flex items-center gap-1">
                      <User className="w-2 h-2" />
                      <span>复核: {mark.reviewedBy}</span>
                      <span>·</span>
                      <span>{mark.reviewedAt ? formatTime(mark.reviewedAt) : ''}</span>
                    </div>
                    {mark.reviewReason && (
                      <div className="text-warn-yellow/70 italic mt-0.5">
                        "{mark.reviewReason}"
                      </div>
                    )}
                  </div>
                )}

                {mark.status === 'pending' && canMark && (
                  <button
                    onClick={() => unmarkOutlier(mark.id)}
                    className="text-[9px] text-alert-orange/70 hover:text-alert-orange underline"
                  >
                    撤销标记
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </HudCard>
    </div>
  );
}
