import { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeftRight,
  Eye,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useSampleStore } from '@/stores/sampleStore';
import { TracePath } from '@/components/TracePath';
import { Empty } from '@/components/Empty';
import { cn } from '@/lib/utils';
import { FinalConclusion } from '@/types';

export default function TracePage() {
  const {
    conclusions,
    versions,
    users,
    dedupResults,
    generateTracePath,
    tracePath,
    selectedConclusion,
    setSelectedConclusion,
    getCommentsForBarcode,
  } = useSampleStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showTraceDemo, setShowTraceDemo] = useState(false);

  const finalConclusions = useMemo(() => {
    return conclusions.filter((c) => c.isFinal);
  }, [conclusions]);

  const filteredConclusions = useMemo(() => {
    if (!searchQuery) return finalConclusions;
    const query = searchQuery.toLowerCase();
    return finalConclusions.filter(
      (c) =>
        c.barcode.toLowerCase().includes(query) ||
        c.finalResult.toLowerCase().includes(query) ||
        c.conclusion.toLowerCase().includes(query)
    );
  }, [finalConclusions, searchQuery]);

  const handleSelectConclusion = (conclusion: FinalConclusion) => {
    setSelectedConclusion(conclusion);
    generateTracePath(conclusion.conclusionId);
  };

  const handleJumpToSource = (sourceOriginId: string) => {
    const version = versions.find((v) => v.sourceOrigin.id === sourceOriginId);
    if (version) {
      alert(`跳转到原始来源: ${version.sourceOrigin.originalFileName}, 行号: ${version.sourceOrigin.originalRowNumber}`);
    }
  };

  const handleJumpToVersion = (versionId: string) => {
    const version = versions.find((v) => v.versionId === versionId);
    if (version) {
      alert(`跳转到版本详情: v${version.versionNumber}, 条码: ${version.barcode}`);
    }
  };

  const handleJumpToComment = (commentId: string) => {
    const comment = useSampleStore.getState().comments.find((c) => c.commentId === commentId);
    if (comment) {
      alert(`跳转到复核意见: ${comment.content.substring(0, 50)}...`);
    }
  };

  const handleRunTraceDemo = () => {
    setShowTraceDemo(true);
    if (filteredConclusions.length > 0) {
      handleSelectConclusion(filteredConclusions[0]);
    }
  };

  const getBarcodeStatus = (barcode: string) => {
    const dedup = dedupResults.find((d) => d.barcode === barcode);
    return dedup?.isConfirmedDuplicate ? '重复' : '正常';
  };

  return (
    <div className="space-y-6">
      <div className="lab-card p-4 bg-primary-50 border border-primary-200">
        <div className="flex items-start gap-3">
          <Search size={20} className="text-primary-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-primary-800 mb-1">倒查验证说明</h3>
            <p className="text-sm text-primary-700">
              质控组验收工具：从最终结论一路反向追溯到原始数据来源和处理记录。
              遇到条码重复记录时，可一键跳转到原始行号、图片名或来源备注。
              复核意见和最终结论之间支持双向跳转，避免复盘时人工查表。
            </p>
          </div>
          <button
            onClick={handleRunTraceDemo}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Sparkles size={16} />
            运行追溯演示
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="lab-card p-4">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent-500" />
              最终结论列表
            </h3>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lab-textMuted" size={18} />
                <input
                  type="text"
                  placeholder="搜索条码、结果、结论..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 input-field"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredConclusions.map((conclusion) => {
                const operator = users.find((u) => u.id === conclusion.confirmedBy);
                const comments = getCommentsForBarcode(conclusion.barcode);
                const isSelected = selectedConclusion?.conclusionId === conclusion.conclusionId;
                const status = getBarcodeStatus(conclusion.barcode);

                return (
                  <button
                    key={conclusion.conclusionId}
                    onClick={() => handleSelectConclusion(conclusion)}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all',
                      isSelected
                        ? 'bg-accent-50 border-2 border-accent-200 shadow-md'
                        : 'bg-lab-bg border-2 border-transparent hover:bg-accent-50/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-primary-600">
                        {conclusion.barcode}
                      </span>
                      {status === '重复' && (
                        <span className="tag-warning text-[10px]">
                          <AlertTriangle size={10} className="mr-0.5" />
                          含重复记录
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-lab-text mb-1 line-clamp-1">
                      {conclusion.finalResult}
                    </p>
                    <p className="text-xs text-lab-textMuted line-clamp-2 mb-2">
                      {conclusion.conclusion}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-lab-textMuted">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {operator?.name || '-'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {dayjs(conclusion.confirmedAt).format('MM-DD HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowLeftRight size={12} />
                        {comments.length} 条复核
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedConclusion ? (
            <>
              <div className="lab-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-lab-text mb-2 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-accent-500" />
                      最终结论详情
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-lab-textMuted">样本条码:</span>
                        <span className="ml-2 font-mono font-medium text-primary-600">
                          {selectedConclusion.barcode}
                        </span>
                      </div>
                      <div>
                        <span className="text-lab-textMuted">确认人:</span>
                        <span className="ml-2">
                          {users.find((u) => u.id === selectedConclusion.confirmedBy)?.name || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-lab-textMuted">确认时间:</span>
                        <span className="ml-2">
                          {dayjs(selectedConclusion.confirmedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </span>
                      </div>
                      <div>
                        <span className="text-lab-textMuted">最终结果:</span>
                        <span className="ml-2 font-medium text-accent-600">
                          {selectedConclusion.finalResult}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-accent-50 rounded-lg border border-accent-100">
                      <p className="text-sm font-medium text-accent-800 mb-1">结论说明</p>
                      <p className="text-sm text-accent-700">{selectedConclusion.conclusion}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedConclusion.reviewCommentIds.length > 0 && (
                <div className="lab-card p-4">
                  <h4 className="font-medium text-lab-text mb-3 flex items-center gap-2">
                    <ArrowLeftRight size={16} className="text-primary-500" />
                    关联的复核意见
                    <span className="text-xs text-lab-textMuted font-normal ml-2">
                      点击可跳转到对应复核意见
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {selectedConclusion.reviewCommentIds.map((commentId) => {
                      const comment = useSampleStore
                        .getState()
                        .comments.find((c) => c.commentId === commentId);
                      if (!comment) return null;
                      const reviewer = users.find((u) => u.id === comment.reviewedBy);
                      return (
                        <button
                          key={commentId}
                          onClick={() => handleJumpToComment(commentId)}
                          className="w-full p-3 bg-lab-bg rounded-lg hover:bg-primary-50 transition-colors text-left group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-lab-text">{comment.content}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-lab-textMuted">
                                <span className="flex items-center gap-1">
                                  <User size={12} />
                                  {reviewer?.name || '-'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {dayjs(comment.reviewedAt).format('YYYY-MM-DD HH:mm')}
                                </span>
                              </div>
                            </div>
                            <ExternalLink
                              size={14}
                              className="text-lab-textMuted group-hover:text-primary-600 transition-colors"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <TracePath
                tracePath={tracePath}
                onJumpToSource={handleJumpToSource}
                onJumpToVersion={handleJumpToVersion}
              />

              {tracePath && (
                <div className="lab-card p-4">
                  <h4 className="font-medium text-lab-text mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-warning-500" />
                    追溯验证结果
                  </h4>
                  <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
                    <p className="text-sm text-warning-800">
                      <span className="font-medium">验证状态:</span> 追溯完成，数据链路完整可验证
                    </p>
                    <p className="text-sm text-warning-700 mt-2">
                      <span className="font-medium">节点数:</span> {tracePath.totalSteps} 个处理节点，
                      涉及 <span className="font-medium">{tracePath.operators.length}</span> 名操作人，
                      处理时长 <span className="font-medium">
                        {dayjs(tracePath.timeSpan.end).diff(dayjs(tracePath.timeSpan.start), 'hour', true).toFixed(1)}
                      </span> 小时
                    </p>
                    <p className="text-sm text-warning-700 mt-2">
                      <span className="font-medium">原始来源:</span> 所有版本均保留完整的原始行号、文件名和来源备注，
                      可随时跳转验证
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Empty
              title="选择一条最终结论"
              description="从左侧列表选择已确认的最终结论，系统将自动构建完整的追溯链路，从数据导入到最终结论一目了然"
              icon={Search}
            />
          )}
        </div>
      </div>
    </div>
  );
}
