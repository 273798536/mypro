import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  History,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileWarning,
  AlertTriangle,
  Tag,
  Edit3
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { RiskBadge } from '../components/RiskBadge';
import { IntentTag } from '../components/IntentTag';
import { ConfidenceBar } from '../components/ConfidenceBar';
import {
  INTENT_LABELS,
  SOURCE_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  VERSION_TYPE_LABELS
} from '../../shared/types';
import type { Intent, RiskLevel, MaterialSource, Conversation } from '../../shared/types';

export const Review: React.FC = () => {
  const {
    conversations,
    selectedConversation,
    versions,
    filters,
    loading,
    setFilters,
    fetchConversations,
    selectConversation,
    reviewConversation,
    rollbackVersion,
    fetchTruncationInfos,
    fetchToolCallErrors,
    truncationInfos,
    toolCallErrors
  } = useStore();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewIntent, setReviewIntent] = useState<Intent>('inquiry');
  const [reviewRemark, setReviewRemark] = useState('');
  const [operator] = useState('张工程师');

  useEffect(() => {
    fetchConversations();
    fetchTruncationInfos();
    fetchToolCallErrors();
  }, [fetchConversations, fetchTruncationInfos, fetchToolCallErrors]);

  const handleReview = async () => {
    if (!selectedConversation) return;

    await reviewConversation(selectedConversation.id, {
      correctedIntent: reviewIntent,
      reviewRemark,
      operator
    });

    setShowReviewModal(false);
    setReviewRemark('');
  };

  const handleRollback = async (versionId: string) => {
    if (!selectedConversation) return;

    if (confirm('确定要回滚到此版本吗？')) {
      await rollbackVersion(selectedConversation.id, versionId, operator);
    }
  };

  const openReviewModal = (conversation: Conversation) => {
    setReviewIntent(conversation.predictedIntent);
    setShowReviewModal(true);
  };

  const getTruncationForConversation = (convId: string) => {
    return truncationInfos.find(t => t.conversationId === convId);
  };

  const getToolErrorForConversation = (convId: string) => {
    return toolCallErrors.find(t => t.conversationId === convId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">意图复核</h1>
          <p className="text-gray-500 mt-1">审核AI预测结果，人工修正意图漂移</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索会话ID、用户输入..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search || ''}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>

          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.riskLevel || ''}
            onChange={(e) => setFilters({ riskLevel: (e.target.value as RiskLevel) || undefined })}
          >
            <option value="">全部风险等级</option>
            {Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.sourceType || ''}
            onChange={(e) => setFilters({ sourceType: (e.target.value as MaterialSource) || undefined })}
          >
            <option value="">全部来源</option>
            {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.hasDrift === true ? 'true' : filters.hasDrift === false ? 'false' : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ hasDrift: val === '' ? undefined : val === 'true' });
            }}
          >
            <option value="">全部状态</option>
            <option value="true">有漂移</option>
            <option value="false">无漂移</option>
          </select>

          <button
            onClick={fetchConversations}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">会话列表</h3>
            <p className="text-sm text-gray-500 mt-1">共 {conversations?.total || 0} 条记录</p>
          </div>

          {loading.conversations ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {conversations?.items.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono text-blue-600">{conv.id}</span>
                      {conv.hasDrift && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2 mb-2">{conv.userInput}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <IntentTag intent={conv.originalIntent} variant="outline" />
                      {conv.hasDrift && <ChevronRight className="w-3 h-3 text-gray-400" />}
                      {conv.hasDrift && <IntentTag intent={conv.predictedIntent} />}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <RiskBadge level={conv.riskLevel} />
                      <span className="text-xs text-gray-400">
                        {new Date(conv.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters({ page: filters.page - 1 })}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  第 {filters.page} 页 / 共 {Math.ceil((conversations?.total || 0) / filters.pageSize)} 页
                </span>
                <button
                  onClick={() => setFilters({ page: filters.page + 1 })}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">会话详情</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-mono">{selectedConversation.id}</span>
                    {' · '}
                    {SOURCE_TYPE_LABELS[selectedConversation.sourceType]}
                    {selectedConversation.remark && (
                      <span className="ml-2 text-amber-600">
                        <Tag className="w-3 h-3 inline mr-1" />
                        {selectedConversation.remark}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => openReviewModal(selectedConversation)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  复核修正
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                {(getTruncationForConversation(selectedConversation.id) ||
                  getToolErrorForConversation(selectedConversation.id)) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-3">
                      <FileWarning className="w-5 h-5" />
                      数据处理说明
                    </h4>
                    {getTruncationForConversation(selectedConversation.id) && (
                      <div className="mb-3">
                        <p className="text-sm text-amber-700 font-medium mb-1">文本截断说明</p>
                        <p className="text-sm text-amber-600">
                          {getTruncationForConversation(selectedConversation.id)?.humanReadableReason}
                        </p>
                        <p className="text-xs text-amber-500 mt-1">
                          技术原因：{getTruncationForConversation(selectedConversation.id)?.technicalReason}
                        </p>
                      </div>
                    )}
                    {getToolErrorForConversation(selectedConversation.id) && (
                      <div>
                        <p className="text-sm text-amber-700 font-medium mb-1">工具调用错误定位</p>
                        <p className="text-sm text-amber-600">
                          {getToolErrorForConversation(selectedConversation.id)?.humanReadableMessage}
                        </p>
                        <p className="text-xs text-amber-500 mt-1">
                          位置：{getToolErrorForConversation(selectedConversation.id)?.sourceFile}
                          {' '}第 {getToolErrorForConversation(selectedConversation.id)?.lineNumber} 行
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    用户输入
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedConversation.userInput || '<空内容>'}</p>
                    {selectedConversation.assistantResponse && (
                      <>
                        <hr className="my-3 border-gray-200" />
                        <p className="text-sm text-gray-500 mb-1">客服回复：</p>
                        <p className="text-gray-700">{selectedConversation.assistantResponse}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase mb-2">原始标注</p>
                    <IntentTag intent={selectedConversation.originalIntent} variant="outline" />
                    <p className="text-xs text-gray-400 mt-2">
                      置信度: <ConfidenceBar value={selectedConversation.annotationConfidence} />
                    </p>
                  </div>
                  <div className={`rounded-lg p-4 border ${
                    selectedConversation.hasDrift
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <p className="text-xs text-gray-500 uppercase mb-2">AI预测</p>
                    <IntentTag intent={selectedConversation.predictedIntent} />
                    <p className="text-xs text-gray-400 mt-2">
                      置信度: <ConfidenceBar value={selectedConversation.predictionConfidence} />
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">风险等级：</span>
                    <RiskBadge level={selectedConversation.riskLevel} />
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">状态：</span>
                    <span className={`text-sm ${
                      selectedConversation.isReviewed ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {selectedConversation.isReviewed ? '已复核' : '待复核'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">漂移状态：</span>
                    <span className={`text-sm ${
                      selectedConversation.hasDrift ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {selectedConversation.hasDrift ? '存在漂移' : '无漂移'}
                    </span>
                  </div>
                </div>

                {selectedConversation.promptVersionId && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>提示词版本：</strong>
                      关联提示词版本 ID: {selectedConversation.promptVersionId}
                    </p>
                    {selectedConversation.trainingSampleId && (
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>训练样本：</strong>
                        关联训练样本 ID: {selectedConversation.trainingSampleId}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-500" />
                    版本历史
                  </h4>
                  <div className="relative pl-6">
                    {versions.map((version, idx) => (
                      <div key={version.id} className="pb-6 last:pb-0 relative">
                        {idx < versions.length - 1 && (
                          <div className="absolute left-[-25px] top-6 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        <div className={`absolute left-[-29px] w-3 h-3 rounded-full border-2 border-white ${
                          version.versionType === 'manual' ? 'bg-green-500' :
                          version.versionType === 'rollback' ? 'bg-purple-500' :
                          version.versionType === 'prediction' ? 'bg-blue-500' : 'bg-gray-500'
                        }`} />

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                version.versionType === 'manual' ? 'bg-green-100 text-green-700' :
                                version.versionType === 'rollback' ? 'bg-purple-100 text-purple-700' :
                                version.versionType === 'prediction' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {VERSION_TYPE_LABELS[version.versionType]}
                              </span>
                              <span className="text-xs text-gray-500">
                                {version.operator} · {new Date(version.createdAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            {idx > 0 && (
                              <button
                                onClick={() => handleRollback(version.id)}
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                回滚到此版本
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <IntentTag intent={version.intent} />
                            <ConfidenceBar value={version.confidence} />
                          </div>
                          {version.changeRemark && (
                            <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100">
                              <strong className="text-gray-700">说明：</strong>
                              {version.changeRemark}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center text-gray-400">
                <Edit3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>请从左侧选择一个会话进行复核</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReviewModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">人工复核</h3>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700 line-clamp-3">{selectedConversation.userInput}</p>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">原始标注</p>
                  <IntentTag intent={selectedConversation.originalIntent} variant="outline" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">AI预测</p>
                  <IntentTag intent={selectedConversation.predictedIntent} />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">复核结果</p>
                  <select
                    className="px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reviewIntent}
                    onChange={(e) => setReviewIntent(e.target.value as Intent)}
                  >
                    {Object.entries(INTENT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  复核说明 <span className="text-gray-400">(必填，用于版本追踪)</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="请说明修正原因..."
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleReview}
                  disabled={!reviewRemark.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认复核
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
