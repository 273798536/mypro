import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GitCompare,
  User,
  Clock,
  AlertTriangle,
  Sparkles,
  Eye,
  Edit3,
  MessageSquare,
} from 'lucide-react';
import dayjs from 'dayjs';
import { DiffResult } from '@/types';
import { useSampleStore } from '@/stores/sampleStore';
import { diffEngine } from '@/engines/diffEngine';
import { cn } from '@/lib/utils';

interface DiffListProps {
  diffs: DiffResult[];
  onViewVersion: (versionId: string) => void;
  onAddCorrection: (versionId: string) => void;
  onAddReview: (barcode: string, versionId: string) => void;
}

export function DiffList({ diffs, onViewVersion, onAddCorrection, onAddReview }: DiffListProps) {
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);
  const { users } = useSampleStore();

  if (diffs.length === 0) {
    return (
      <div className="lab-card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center">
          <Sparkles className="text-accent-500" size={32} />
        </div>
        <h3 className="text-lg font-medium text-lab-text mb-2">暂无待处理差异</h3>
        <p className="text-lab-textMuted text-sm">所有样本数据已同步，无需人工干预</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diffs.map((diff, index) => {
        const isExpanded = expandedDiffId === `${diff.barcode}-${index}`;
        const operator = users.find((u) => u.id === diff.newVersion.createdBy);
        const hasAiSuggestions = diff.changedFields.some((f) => f.isAiSuggested);
        const hasDuplicate = diff.newVersion.isDuplicate;

        return (
          <div
            key={`${diff.barcode}-${index}`}
            className={cn(
              'lab-card overflow-hidden transition-all duration-300 animate-slide-up',
              hasDuplicate && 'ring-2 ring-warning-400/50 animate-pulse-border'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className="p-4 cursor-pointer hover:bg-lab-bg/50 transition-colors"
              onClick={() => setExpandedDiffId(isExpanded ? null : `${diff.barcode}-${index}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-lg text-primary-600">
                      {diff.barcode}
                    </span>
                    <span className="tag-primary">
                      v{diff.oldVersion.versionNumber} → v{diff.newVersion.versionNumber}
                    </span>
                    {hasAiSuggestions && (
                      <span className="tag-accent">
                        <Sparkles size={12} className="mr-1" />
                        AI建议
                      </span>
                    )}
                    {hasDuplicate && (
                      <span className="tag-warning">
                        <AlertTriangle size={12} className="mr-1" />
                        条码重复
                      </span>
                    )}
                    <span
                      className={cn('tag', {
                        'bg-warning-50 text-warning-700': diff.newVersion.status === 'reviewing',
                        'bg-primary-50 text-primary-700': diff.newVersion.status === 'pending',
                        'bg-danger-50 text-danger-700': diff.newVersion.status === 'conflict',
                      })}
                    >
                      {diff.newVersion.status === 'reviewing' && '复核中'}
                      {diff.newVersion.status === 'pending' && '待处理'}
                      {diff.newVersion.status === 'conflict' && '有冲突'}
                    </span>
                  </div>

                  <p className="text-sm text-lab-textMuted mb-2">
                    <span className="font-medium text-lab-text">{diff.newVersion.changeReason}</span>
                    {' · '}
                    变更字段: <span className="font-medium text-primary-600">{diff.changedFields.length}</span> 处
                  </p>

                  <div className="flex items-center gap-4 text-xs text-lab-textMuted">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {operator?.name || '未知用户'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {dayjs(diff.newVersion.createdAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitCompare size={14} />
                      {diff.newVersion.sequencingResult.geneName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-lab-border bg-lab-bg/30 p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-lab-text mb-3 flex items-center gap-2">
                    <GitCompare size={16} className="text-primary-500" />
                    变更详情
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="data-table text-sm">
                      <thead>
                        <tr>
                          <th>字段</th>
                          <th>变更前 (v{diff.oldVersion.versionNumber})</th>
                          <th>变更后 (v{diff.newVersion.versionNumber})</th>
                          <th>来源</th>
                          <th>置信度</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diff.changedFields.map((field, idx) => (
                          <tr key={idx}>
                            <td className="font-medium">
                              {diffEngine.formatFieldLabel(field.field)}
                            </td>
                            <td className="diff-removed font-mono text-xs">
                              {String(field.oldValue)}
                            </td>
                            <td className="diff-added font-mono text-xs">
                              {String(field.newValue)}
                            </td>
                            <td>
                              {field.isAiSuggested ? (
                                <span className="tag-accent text-[10px]">
                                  <Sparkles size={10} className="mr-0.5" />
                                  AI建议
                                </span>
                              ) : (
                                <span className="tag-primary text-[10px]">人工</span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-lab-border rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      field.confidence >= 0.8
                                        ? 'bg-accent-500'
                                        : field.confidence >= 0.5
                                        ? 'bg-warning-500'
                                        : 'bg-danger-500'
                                    )}
                                    style={{ width: `${field.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-mono">
                                  {Math.round(field.confidence * 100)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {diff.aiAnalysis && diff.aiAnalysis.suggestions.length > 0 && (
                  <div className="mb-4 p-3 bg-accent-50 rounded-lg border border-accent-100">
                    <h4 className="text-sm font-medium text-accent-700 mb-2 flex items-center gap-2">
                      <Sparkles size={16} />
                      AI分析建议
                    </h4>
                    <div className="space-y-2">
                      {diff.aiAnalysis.suggestions.map((suggestion, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="text-accent-800">
                            <span className="font-medium">建议:</span> {suggestion.suggestedValue}
                          </p>
                          <p className="text-xs text-accent-600 mt-1">
                            理由: {suggestion.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-lab-textMuted">
                    <span className="font-medium">原始来源:</span>{' '}
                    {diff.newVersion.sourceOrigin.sourceRemark}
                    {' · '}
                    行号: {diff.newVersion.sourceOrigin.originalRowNumber}
                    {' · '}
                    文件: {diff.newVersion.sourceOrigin.originalFileName}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewVersion(diff.newVersion.versionId);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm btn-secondary"
                    >
                      <Eye size={14} />
                      查看版本
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddCorrection(diff.newVersion.versionId);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm btn-primary"
                    >
                      <Edit3 size={14} />
                      人工修正
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddReview(diff.barcode, diff.newVersion.versionId);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm btn-accent"
                    >
                      <MessageSquare size={14} />
                      录入复核意见
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
