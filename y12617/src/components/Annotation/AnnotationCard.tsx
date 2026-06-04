import React, { useState } from 'react';
import { AnnotationTypeBadge, AnnotationStatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAnnotation } from '../../hooks/useAnnotation';
import { usePhysicsStore } from '../../store';
import { formatTime, formatDateTime } from '../../utils/time';
import type { Annotation } from '../../types/annotation';

interface AnnotationCardProps {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
}

export const AnnotationCard: React.FC<AnnotationCardProps> = ({
  annotation,
  isSelected,
  onSelect,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [processNote, setProcessNote] = useState('');
  const { addProcessNote, updateStatus, deleteAnnotation } = useAnnotation();
  const { restoreFromSnapshot, snapshots } = usePhysicsStore();

  const isAnomaly = annotation.type !== 'normal';
  const snapshot = snapshots.find(s => s.id === annotation.snapshotId);

  const handleViewSnapshot = () => {
    if (snapshot) {
      restoreFromSnapshot(snapshot);
    }
  };

  const handleAddNote = () => {
    if (processNote.trim()) {
      addProcessNote(annotation.id, processNote.trim());
      setProcessNote('');
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-md'
          : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm'
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-neutral-500">
              {formatTime(annotation.timePoint)}
            </span>
            <AnnotationTypeBadge type={annotation.type} />
            <AnnotationStatusBadge status={annotation.status} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-neutral-100 rounded transition-colors"
          >
            <svg
              className={`w-4 h-4 text-neutral-400 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <p className={`text-sm ${isAnomaly ? 'text-accent-orange' : 'text-neutral-700'}`}>
          {annotation.content}
        </p>

        <div className="flex items-center justify-between mt-3 text-xs text-neutral-400">
          <span>ID: {annotation.id.substring(0, 15)}...</span>
          <span>{formatDateTime(annotation.createdAt)}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleViewSnapshot();
              }}
            >
              查看快照
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(annotation.id, 'confirmed');
              }}
              disabled={annotation.status === 'confirmed'}
            >
              确认
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(annotation.id, 'pending_review');
              }}
              disabled={annotation.status === 'pending_review'}
            >
              提交审核
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定删除此标注吗？')) {
                  deleteAnnotation(annotation.id);
                }
              }}
            >
              删除
            </Button>
          </div>

          {annotation.processNotes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-neutral-700 mb-2">处理意见</h4>
              <div className="space-y-2">
                {annotation.processNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-neutral-50 rounded-lg p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-primary-600">{note.author}</span>
                      <span className="text-xs text-neutral-400">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-neutral-600">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-neutral-700 mb-2">添加处理意见</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={processNote}
                onChange={(e) => setProcessNote(e.target.value)}
                placeholder="输入处理意见..."
                className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddNote();
                }}
                disabled={!processNote.trim()}
              >
                添加
              </Button>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">快照ID</span>
              <span className="font-mono text-neutral-700">{annotation.snapshotId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">球体位置</span>
              <span className="font-mono text-neutral-700">
                ({Math.round(annotation.ballPosition.x)}, {Math.round(annotation.ballPosition.y)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">更新时间</span>
              <span className="text-neutral-700">{formatDateTime(annotation.updatedAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
