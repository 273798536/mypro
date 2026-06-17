import { useState } from 'react';
import { GitMerge, ChevronDown, ChevronUp, Check, X, User } from 'lucide-react';
import { MergeSuggestion, ComplaintRecord } from '../types';
import { Card, SectionHeader, Badge, Button } from './ui';

interface MergePanelProps {
  suggestions: MergeSuggestion[];
  complaints: ComplaintRecord[];
  onMerge: (suggestionId: string, recordIds: string[]) => void;
  onKeepSeparate: (suggestionId: string) => void;
  mergedRecordIds: Set<string>;
}

export function MergePanel({ suggestions, complaints, onMerge, onKeepSeparate, mergedRecordIds }: MergePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(suggestions[0]?.id || null);
  const [decidedIds, setDecidedIds] = useState<Set<string>>(new Set());

  const activeSuggestions = suggestions.filter(s => !decidedIds.has(s.id));
  const decidedSuggestions = suggestions.filter(s => decidedIds.has(s.id));

  const getRecords = (suggestion: MergeSuggestion) => {
    return complaints.filter(c => suggestion.recordIds.includes(c.id));
  };

  const handleMerge = (suggestion: MergeSuggestion) => {
    setDecidedIds(prev => new Set(prev).add(suggestion.id));
    onMerge(suggestion.id, suggestion.recordIds);
  };

  const handleKeepSeparate = (suggestionId: string) => {
    setDecidedIds(prev => new Set(prev).add(suggestionId));
    onKeepSeparate(suggestionId);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-red-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.6) return '中';
    return '低';
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="重复投诉归并提示"
        icon={<GitMerge className="w-5 h-5 text-blue-500" />}
        description="系统检测到疑似重复的投诉记录，请人工确认是否合并"
        badge={
          <Badge severity="warning">
            {activeSuggestions.length}组待确认
          </Badge>
        }
      />

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <GitMerge className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>未检测到疑似重复的投诉记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeSuggestions.map(suggestion => {
            const isExpanded = expandedId === suggestion.id;
            const records = getRecords(suggestion);
            const isMerged = suggestion.recordIds.some(id => mergedRecordIds.has(id));

            return (
              <div
                key={suggestion.id}
                className={`border rounded-lg overflow-hidden ${
                  suggestion.confidence >= 0.8 ? 'border-red-200' : 'border-yellow-200'
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-gray-900">
                          {suggestion.street}
                          {suggestion.intersection && ` · ${suggestion.intersection}`}
                        </span>
                        <Badge severity={suggestion.confidence >= 0.8 ? 'error' : 'warning'}>
                          相似度 {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        {isMerged && (
                          <Badge severity="success">已合并</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        共{records.length}条记录 · {suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                        {getConfidenceLabel(suggestion.confidence)}度疑似
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">详细对比</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {records.map((record, idx) => (
                          <div
                            key={record.id}
                            className={`p-3 rounded-lg border ${
                              mergedRecordIds.has(record.id)
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-500">记录 {idx + 1}</span>
                              {mergedRecordIds.has(record.id) && (
                                <Badge severity="success">已合并</Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-gray-400" />
                                <span>{record.reporter}</span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-500">
                                  {record.reportedTime.toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">类型：</span>
                                {record.complaintType}
                              </div>
                              <div>
                                <span className="text-gray-500">描述：</span>
                                {record.description}
                              </div>
                              {record.seatCount !== undefined && (
                                <div>
                                  <span className="text-gray-500">座椅：</span>
                                  {record.seatCount}个
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                来源：{record.rawReference.source} · 第{record.rawReference.lineNumber || '未知'}行
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ 重要提示：</strong>
                        系统建议{suggestion.suggestedAction === 'merge' ? '合并' : '人工判断'}这些记录。
                        {suggestion.suggestedAction === 'merge'
                          ? ' 合并后将作为一条记录处理，原始数据仍会保留以便追溯。'
                          : ' 请仔细对比内容，确认是否为同一问题。'}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleKeepSeparate(suggestion.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                        不合并，保留独立
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMerge(suggestion);
                        }}
                      >
                        <Check className="w-4 h-4" />
                        确认合并
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {decidedSuggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h5 className="text-sm font-medium text-gray-700 mb-2">已处理 ({decidedSuggestions.length})</h5>
              <div className="space-y-2">
                {decidedSuggestions.map(s => {
                  const wasMerged = s.recordIds.some(id => mergedRecordIds.has(id));
                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                        wasMerged
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {wasMerged ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-500" />
                        )}
                        <span>
                          {s.street}
                          {s.intersection && ` · ${s.intersection}`}
                          {' · '}
                          {s.recordIds.length}条记录
                        </span>
                      </div>
                      <Badge severity={wasMerged ? 'success' : 'info'}>
                        {wasMerged ? '已合并' : '保持独立'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
