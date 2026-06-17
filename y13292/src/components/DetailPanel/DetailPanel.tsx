import { useState } from 'react';
import {
  Info,
  Camera,
  Clock,
  User,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Upload,
  ArrowRight,
  History,
} from 'lucide-react';
import { useComplaintStore } from '../../store/useComplaintStore';
import { statusLabels, sourceLabels } from '../../types';
import type { ComplaintStatus } from '../../types';
import { cn } from '../../lib/utils';

const statusColors: Record<ComplaintStatus, string> = {
  normal: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
  overload: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  pending: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  confirmed: 'text-sky-400 bg-sky-500/20 border-sky-500/30',
};

const statusDotColors: Record<ComplaintStatus, string> = {
  normal: 'bg-emerald-500',
  overload: 'bg-orange-500',
  pending: 'bg-yellow-500',
  confirmed: 'bg-sky-500',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DetailPanel() {
  const {
    getSelectedPoint,
    getPhotosByPointId,
    getStatusChangesByPointId,
    getTimelineByPointId,
    confirmPoint,
  } = useComplaintStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmReason, setConfirmReason] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const point = getSelectedPoint();

  if (!point) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        <div className="text-center text-slate-500">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">选择左侧点位查看详情</p>
        </div>
      </div>
    );
  }

  const photos = getPhotosByPointId(point.id);
  const statusChanges = getStatusChangesByPointId(point.id);
  const timeline = getTimelineByPointId(point.id);

  const handleConfirm = () => {
    if (!confirmReason.trim()) return;
    confirmPoint(point.id, confirmReason, '规划师小赵');
    setShowConfirmModal(false);
    setConfirmReason('');
  };

  const overloadPercent =
    point.capacity && point.actualLoad
      ? Math.round(((point.actualLoad - point.capacity) / point.capacity) * 100)
      : 0;

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-100 truncate">
              {point.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
                  statusColors[point.status]
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', statusDotColors[point.status])} />
                {statusLabels[point.status]}
              </span>
              <span className="text-xs text-slate-500">
                来源: {sourceLabels[point.source]}
              </span>
            </div>
          </div>
        </div>

        {point.address && (
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>{point.address}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {point.capacity && point.actualLoad && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-slate-200">承载数据</span>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-xs text-slate-500">实际承载</div>
                  <div className="text-xl font-bold text-slate-100">
                    {point.actualLoad}
                    <span className="text-xs font-normal text-slate-500 ml-1">人/时</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">设计容量</div>
                  <div className="text-lg font-medium text-slate-400">
                    {point.capacity}
                    <span className="text-xs font-normal ml-1">人/时</span>
                  </div>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    point.status === 'overload' ? 'bg-orange-500' : 'bg-emerald-500'
                  )}
                  style={{
                    width: `${Math.min((point.actualLoad / point.capacity) * 100, 100)}%`,
                  }}
                />
              </div>
              {point.status === 'overload' && (
                <div className="text-right mt-1">
                  <span className="text-xs text-orange-400 font-medium">
                    超限 {overloadPercent}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-medium text-slate-200">投诉描述</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{point.description}</p>
        </div>

        {photos.length > 0 && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-slate-200">现场照片</span>
                <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                  {photos.length}
                </span>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-slate-800 aspect-video mb-3">
              <img
                src={photos[selectedPhotoIndex].url}
                alt={photos[selectedPhotoIndex].description}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-xs text-slate-200">
                  {photos[selectedPhotoIndex].description}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {photos[selectedPhotoIndex].uploadedBy} ·{' '}
                  {formatDate(photos[selectedPhotoIndex].uploadedAt)}
                </p>
              </div>
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={cn(
                      'flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all',
                      index === selectedPhotoIndex
                        ? 'border-sky-500 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={photo.description}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {statusChanges.length > 0 && (
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-200">状态变更历史</span>
            </div>
            <div className="space-y-3">
              {statusChanges.map((change) => (
                <div key={change.id} className="relative pl-4">
                  <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-slate-500" />
                  {statusChanges.indexOf(change) < statusChanges.length - 1 && (
                    <div className="absolute left-[3px] top-3.5 bottom-0 w-px bg-slate-700" />
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        statusColors[change.fromStatus as ComplaintStatus]
                      )}
                    >
                      {statusLabels[change.fromStatus as ComplaintStatus]}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        statusColors[change.toStatus as ComplaintStatus]
                      )}
                    >
                      {statusLabels[change.toStatus as ComplaintStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{change.reason}</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {change.operator} · {formatDate(change.changedAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeline.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-200">事件时间线</span>
            </div>
            <div className="space-y-2">
              {timeline.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="text-xs text-slate-400 flex items-start gap-2"
                >
                  <span className="text-slate-600 flex-shrink-0 w-14">
                    {formatDate(event.eventAt).split(' ')[1]}
                  </span>
                  <span className="text-slate-300">{event.title}</span>
                </div>
              ))}
              {timeline.length > 5 && (
                <div className="text-xs text-slate-600 text-center pt-1">
                  还有 {timeline.length - 5} 条事件...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700/50 space-y-2 bg-slate-800/30">
        {point.status !== 'confirmed' && (
          <button
            onClick={() => setShowConfirmModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            人工确认
          </button>
        )}
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors">
          <Upload className="w-4 h-4" />
          补录现场照片
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">人工确认</h3>
            <p className="text-sm text-slate-400 mb-4">
              点位: <span className="text-slate-200">{point.name}</span>
            </p>
            <textarea
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              placeholder="请输入确认说明..."
              className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
            />
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <User className="w-3.5 h-3.5" />
              <span>操作人: 规划师小赵</span>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!confirmReason.trim()}
                className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
