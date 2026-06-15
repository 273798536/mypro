import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, ArrowRight, Check } from 'lucide-react';
import { ReviewEntry } from '../types/review';
import { DataStatus, NextStep, ReviewEntryType } from '../types/common';
import { getStatusLabel, getNextStepLabel, getNextStepDescription, formatDateTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface ReviewItemProps {
  entry: ReviewEntry;
  onStatusChange: (status: DataStatus, note?: string) => void;
  delay?: number;
}

const typeLabels: Record<ReviewEntryType, { label: string; icon: string; color: string }> = {
  [ReviewEntryType.RISK_ALERT]: { label: '风险通报', icon: '🚨', color: 'border-status-review' },
  [ReviewEntryType.WATER_RECORD]: { label: '水质记录', icon: '💧', color: 'border-ocean-500' },
  [ReviewEntryType.DUPLICATE]: { label: '重复上报', icon: '📋', color: 'border-status-pending' },
};

const statusOptions: { status: DataStatus; label: string; color: string }[] = [
  { status: DataStatus.AVAILABLE, label: '可用', color: 'bg-status-available' },
  { status: DataStatus.PENDING, label: '暂缓', color: 'bg-status-pending' },
  { status: DataStatus.NEED_REVIEW, label: '需复核', color: 'bg-status-review' },
  { status: DataStatus.RECOLLECT, label: '需重采', color: 'bg-status-recollect' },
];

export const ReviewItem: React.FC<ReviewItemProps> = ({ entry, onStatusChange, delay = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [note, setNote] = useState(entry.reviewerNote || '');
  const [hasChanged, setHasChanged] = useState(false);

  const typeInfo = typeLabels[entry.type];
  const isReviewed = !!entry.reviewedAt;

  const handleStatusClick = (status: DataStatus) => {
    setHasChanged(true);
    onStatusChange(status, note || undefined);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setHasChanged(true);
  };

  const handleSaveNote = () => {
    onStatusChange(entry.status, note);
    setHasChanged(false);
  };

  const getNextStepSuggestion = (status: DataStatus): NextStep => {
    switch (status) {
      case DataStatus.AVAILABLE:
        return NextStep.NO_ACTION;
      case DataStatus.PENDING:
        return NextStep.SUPPLEMENT_DATA;
      case DataStatus.NEED_REVIEW:
        return NextStep.ADJUST_PARAMS;
      case DataStatus.RECOLLECT:
        return NextStep.RECOLLECT;
      default:
        return NextStep.NO_ACTION;
    }
  };

  const suggestedNextStep = getNextStepSuggestion(entry.status);

  return (
    <div
      className={`bg-white rounded-lg border-l-4 ${typeInfo.color} border-t border-r border-b border-slate-200 overflow-hidden opacity-0 animate-fade-in-up transition-all duration-300 ${
        isReviewed ? 'opacity-80' : 'hover:shadow-md'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg">{typeInfo.icon}</span>
              <span className="text-xs font-medium text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
                {typeInfo.label}
              </span>
              <StatusBadge status={entry.status} size="sm" />
              {isReviewed && (
                <span className="text-xs text-status-available flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  已复核
                </span>
              )}
            </div>

            <div className="space-y-1">
              {entry.data.pointId && (
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">点位：</span>
                  <span className="font-mono">{entry.data.pointId as string}</span>
                </p>
              )}
              {entry.data.time && (
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">时间：</span>
                  {formatDateTime(entry.data.time as Date)}
                </p>
              )}
              {entry.data.description && (
                <p className="text-sm text-slate-700 font-medium mt-2">
                  {entry.data.description as string}
                </p>
              )}
              {entry.data.salinity !== undefined && (
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">盐度：</span>
                  <span className="font-mono">{entry.data.salinity as number}</span>
                </p>
              )}
              {entry.data.ph !== undefined && (
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">pH：</span>
                  <span className="font-mono">{entry.data.ph as number}</span>
                </p>
              )}
              {entry.data.tideLevel !== undefined && (
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">潮位：</span>
                  <span className="font-mono">{entry.data.tideLevel as number}m</span>
                </p>
              )}
              {entry.data.duplicateOf && (
                <p className="text-sm text-status-pending">
                  与记录 <span className="font-mono">{entry.data.duplicateOf as string}</span> 重复
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            {entry.issue && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-1">问题描述</p>
                <p className="text-sm text-slate-600">{entry.issue.description}</p>
                <p className="text-sm text-slate-500 mt-2">
                  <span className="font-medium">建议：</span>
                  {entry.issue.suggestion}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">标记数据状态</p>
              <div className="flex gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.status}
                    onClick={() => handleStatusClick(opt.status)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                      entry.status === opt.status
                        ? `${opt.color} text-white shadow-md scale-105`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-ocean-50 rounded-lg border border-ocean-200">
              <ArrowRight className="w-5 h-5 text-ocean-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ocean-800 mb-1">
                  下一步建议：{getNextStepLabel(suggestedNextStep)}
                </p>
                <p className="text-xs text-ocean-600">
                  {getNextStepDescription(suggestedNextStep)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                复核意见
              </label>
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="请输入复核意见（可选）..."
                className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent resize-none"
                rows={2}
              />
              {hasChanged && (
                <button
                  onClick={handleSaveNote}
                  className="mt-2 px-4 py-1.5 bg-ocean-600 text-white text-sm rounded hover:bg-ocean-700 transition-colors"
                >
                  保存意见
                </button>
              )}
            </div>

            {isReviewed && (
              <div className="text-xs text-slate-500 flex items-center gap-4">
                <span>复核人：{entry.reviewedBy}</span>
                <span>复核时间：{formatDateTime(entry.reviewedAt!)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
