import { ClipboardCheck, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { fishingRecords } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function ReviewEntry() {
  const { showReviewPanel, setShowReviewPanel, reviewItems, getBadRecords } = useAppStore();
  const navigate = useNavigate();

  const pendingCount = reviewItems.filter((item) => item.status === 'pending').length;
  const badRecords = getBadRecords();
  const totalRecords = fishingRecords.length;
  const reviewedCount = reviewItems.filter((item) => item.status !== 'pending').length;

  return (
    <>
      <button
        onClick={() => setShowReviewPanel(!showReviewPanel)}
        className={cn(
          'absolute right-4 bottom-4 z-20 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all hover:scale-105',
          pendingCount > 0
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
            : 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white'
        )}
      >
        <div className="relative">
          <ClipboardCheck size={20} />
          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-red-500 text-xs font-bold rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium">复核入口</div>
          <div className="text-xs opacity-80">
            {reviewedCount}/{totalRecords} 已复核
          </div>
        </div>
        <ChevronRight size={18} className={cn('transition-transform', showReviewPanel && 'rotate-90')} />
      </button>

      {showReviewPanel && (
        <div className="absolute right-4 bottom-20 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-2xl z-20 overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">复核工作台</h3>
              <span className="text-xs text-slate-400">
                进度: {Math.round((reviewedCount / totalRecords) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all"
                style={{ width: `${(reviewedCount / totalRecords) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-4 text-center">
              <div className="flex-1 bg-emerald-500/10 rounded-lg p-2">
                <CheckCircle size={20} className="mx-auto text-emerald-400 mb-1" />
                <div className="text-lg font-semibold text-white">
                  {reviewItems.filter((i) => i.status === 'confirmed').length}
                </div>
                <div className="text-xs text-slate-400">已通过</div>
              </div>
              <div className="flex-1 bg-yellow-500/10 rounded-lg p-2">
                <Clock size={20} className="mx-auto text-yellow-400 mb-1" />
                <div className="text-lg font-semibold text-white">{pendingCount}</div>
                <div className="text-xs text-slate-400">待复核</div>
              </div>
              <div className="flex-1 bg-red-500/10 rounded-lg p-2">
                <AlertTriangle size={20} className="mx-auto text-red-400 mb-1" />
                <div className="text-lg font-semibold text-white">
                  {reviewItems.filter((i) => i.status === 'rejected').length}
                </div>
                <div className="text-xs text-slate-400">已驳回</div>
              </div>
            </div>

            {badRecords.length > 0 && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-orange-400 mb-2">
                  <AlertTriangle size={14} />
                  <span className="text-sm font-medium">异常数据 ({badRecords.length})</span>
                </div>
                <div className="space-y-1">
                  {badRecords.slice(0, 3).map((record) => (
                    <div
                      key={record.id}
                      className="text-xs text-orange-300/80 flex items-center gap-1"
                    >
                      <span className="w-1 h-1 rounded-full bg-orange-400" />
                      {record.fishSpecies} · {record.angler}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/review')}
              className="w-full py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors"
            >
              进入完整复核模式
            </button>

            <button
              onClick={() => navigate('/report')}
              className="w-full py-2 bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              查看复核报告
            </button>
          </div>
        </div>
      )}
    </>
  );
}
