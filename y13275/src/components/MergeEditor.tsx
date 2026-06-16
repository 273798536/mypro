import { useState, useEffect, useCallback } from 'react';
import { MapPin, Edit3, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirePointStore } from '@/store/useFirePointStore';
import StatusBadge from './StatusBadge';
import SyncIndicator from './SyncIndicator';
import Button from './Button';
import { formatDateTime } from '@/utils/format';

export default function MergeEditor() {
  const {
    getSelectedPoint,
    selectedPointId,
    updatePoint,
    syncStatus,
    lastSavedTime,
    confirmChange,
    getPointChangeHistory,
  } = useFirePointStore();

  const point = getSelectedPoint();
  const [localRemark, setLocalRemark] = useState('');
  const [localMergedFeedback, setLocalMergedFeedback] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (point) {
      setLocalRemark(point.remark);
      setLocalMergedFeedback(point.mergedFeedback);
      setHasUnsavedChanges(false);
    }
  }, [selectedPointId, point]);

  useEffect(() => {
    if (!point) return;
    setHasUnsavedChanges(
      localRemark !== point.remark || localMergedFeedback !== point.mergedFeedback
    );
  }, [localRemark, localMergedFeedback, point]);

  const handleSave = useCallback(async () => {
    if (!point || !hasUnsavedChanges) return;

    const updates: any = {};
    if (localRemark !== point.remark) updates.remark = localRemark;
    if (localMergedFeedback !== point.mergedFeedback) updates.mergedFeedback = localMergedFeedback;

    await updatePoint(point.id, updates);
  }, [point, localRemark, localMergedFeedback, hasUnsavedChanges, updatePoint]);

  useEffect(() => {
    if (!hasUnsavedChanges || syncStatus !== 'idle') return;

    const timer = setTimeout(() => {
      handleSave();
    }, 1500);

    return () => clearTimeout(timer);
  }, [localRemark, localMergedFeedback, hasUnsavedChanges, syncStatus, handleSave]);

  const handleReset = () => {
    if (point) {
      setLocalRemark(point.remark);
      setLocalMergedFeedback(point.mergedFeedback);
      setHasUnsavedChanges(false);
    }
  };

  const handleConfirmAll = () => {
    if (!selectedPointId) return;
    const history = getPointChangeHistory(selectedPointId);
    history.filter((r) => !r.confirmed).forEach((r) => confirmChange(r.id));
  };

  if (!point) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm bg-surface-secondary rounded-lg">
        请选择一个点位进行归并编辑
      </div>
    );
  }

  const unconfirmedCount = selectedPointId
    ? getPointChangeHistory(selectedPointId).filter((r) => !r.confirmed).length
    : 0;

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-primary-100 overflow-hidden">
      <div className="p-4 border-b border-primary-100 bg-gradient-to-r from-primary-50 to-transparent">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
                {point.id}
              </span>
              <StatusBadge status={point.status} />
            </div>
            <h2 className="font-display text-xl font-bold text-text-primary flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              {point.name}
            </h2>
          </div>
          <div className="text-right">
            <SyncIndicator status={syncStatus} lastSavedTime={lastSavedTime} />
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                <Edit3 className="w-3 h-3" />
                编辑中，1.5秒后自动保存
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          <span className="text-text-muted">地址：</span>
          {point.address}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary-500" />
              归并备注
            </label>
            <span className="text-xs text-text-muted font-mono">
              {localRemark.length} 字
            </span>
          </div>
          <textarea
            value={localRemark}
            onChange={(e) => setLocalRemark(e.target.value)}
            placeholder="请输入归并备注，说明归并理由和依据..."
            className={cn(
              'w-full h-24 px-4 py-3 text-sm rounded-lg border-2 transition-all resize-none',
              'bg-surface-secondary focus:bg-surface',
              hasUnsavedChanges && localRemark !== point.remark
                ? 'border-yellow-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
                : 'border-primary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100',
              'focus:outline-none'
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">原始反馈</label>
            <span className="text-xs text-text-muted">来自社区</span>
          </div>
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-text-secondary leading-relaxed">
              {point.originalFeedback || '暂无原始反馈'}
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-primary-200" />
          <div className="relative flex items-center gap-3 pl-4 pb-4">
            <div className="w-4 h-4 rounded-full bg-primary-500 border-4 border-white shadow" />
            <span className="text-xs font-medium text-primary-700">原始说法</span>
          </div>
          <div className="relative flex items-center gap-3 pl-4 pt-4">
            <div className="w-4 h-4 rounded-full bg-accent-500 border-4 border-white shadow" />
            <span className="text-xs font-medium text-accent-700">归并结论</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-500" />
              归并结论
            </label>
            <span className="text-xs text-text-muted font-mono">
              {localMergedFeedback.length} 字
            </span>
          </div>
          <textarea
            value={localMergedFeedback}
            onChange={(e) => setLocalMergedFeedback(e.target.value)}
            placeholder="请输入归并后的最终结论，需要与原始说法对照..."
            className={cn(
              'w-full h-32 px-4 py-3 text-sm rounded-lg border-2 transition-all resize-none',
              'bg-surface-secondary focus:bg-surface',
              hasUnsavedChanges && localMergedFeedback !== point.mergedFeedback
                ? 'border-yellow-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'
                : 'border-primary-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100',
              'focus:outline-none'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-surface-secondary rounded-lg border border-primary-100">
            <div className="text-xs text-text-muted mb-1">创建时间</div>
            <div className="text-sm font-mono text-text-secondary">
              {formatDateTime(point.createdAt)}
            </div>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg border border-primary-100">
            <div className="text-xs text-text-muted mb-1">最后更新</div>
            <div className="text-sm font-mono text-text-secondary">
              {formatDateTime(point.updatedAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-primary-100 bg-surface-secondary">
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            所有修改实时同步至后端，并自动记录变更历史
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={handleReset}
              disabled={!hasUnsavedChanges}
            >
              重置
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={!hasUnsavedChanges || syncStatus === 'saving'}
            >
              立即保存
            </Button>
            {unconfirmedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleConfirmAll}
              >
                确认 {unconfirmedCount} 项变更
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
