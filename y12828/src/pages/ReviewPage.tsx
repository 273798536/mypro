import { useState, useMemo } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  User,
  Clock,
  FileText,
  Search,
  ArrowLeftRight,
  ExternalLink,
  Send,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useSampleStore } from '@/stores/sampleStore';
import { Empty } from '@/components/Empty';
import { cn } from '@/lib/utils';
import { ReviewComment, FinalConclusion } from '@/types';

export default function ReviewPage() {
  const {
    comments,
    conclusions,
    versions,
    users,
    getCommentsForBarcode,
    getConclusionForBarcode,
    addReviewComment,
    confirmConclusion,
    linkCommentToConclusion,
  } = useSampleStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComment, setSelectedComment] = useState<ReviewComment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newConclusion, setNewConclusion] = useState('');
  const [newFinalResult, setNewFinalResult] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending');

  const pendingComments = useMemo(() => {
    return comments.filter((c) => !c.finalConclusionId);
  }, [comments]);

  const confirmedComments = useMemo(() => {
    return comments.filter((c) => c.finalConclusionId);
  }, [comments]);

  const displayComments = activeTab === 'pending' ? pendingComments : confirmedComments;

  const filteredComments = useMemo(() => {
    if (!searchQuery) return displayComments;
    const query = searchQuery.toLowerCase();
    return displayComments.filter(
      (c) =>
        c.barcode.toLowerCase().includes(query) ||
        c.content.toLowerCase().includes(query)
    );
  }, [displayComments, searchQuery]);

  const pendingBarcodes = useMemo(() => {
    const barcodes = new Set<string>();
    pendingComments.forEach((c) => barcodes.add(c.barcode));
    versions
      .filter((v) => v.status === 'reviewing')
      .forEach((v) => barcodes.add(v.barcode));
    return Array.from(barcodes);
  }, [pendingComments, versions]);

  const handleSelectComment = (comment: ReviewComment) => {
    setSelectedComment(comment);
    setNewComment('');
  };

  const handleAddComment = (barcode: string) => {
    if (!newComment.trim()) return;
    const currentUser = users[0];
    const version = versions.find((v) => v.barcode === barcode && v.status === 'reviewing');
    if (!version || !currentUser) return;

    addReviewComment(barcode, version.versionId, newComment, currentUser.id, currentUser.name);
    setNewComment('');
    alert('复核意见已提交');
  };

  const handleConfirmConclusion = (barcode: string) => {
    if (!newFinalResult.trim() || !newConclusion.trim()) {
      alert('请填写最终结果和结论说明');
      return;
    }
    const currentUser = users[0];
    if (!currentUser) return;

    const barcodeComments = getCommentsForBarcode(barcode);
    const commentIds = barcodeComments.map((c) => c.commentId);

    confirmConclusion(
      barcode,
      newFinalResult,
      newConclusion,
      commentIds,
      currentUser.id,
      currentUser.name
    );

    setNewFinalResult('');
    setNewConclusion('');
    alert('最终结论已确认');
  };

  const handleLinkToConclusion = (commentId: string, barcode: string) => {
    const conclusion = getConclusionForBarcode(barcode);
    if (!conclusion) {
      alert('该样本尚无最终结论，请先确认结论');
      return;
    }
    linkCommentToConclusion(commentId, conclusion.conclusionId);
    alert('已关联到最终结论');
  };

  const handleJumpToConclusion = (conclusionId: string) => {
    const conclusion = conclusions.find((c) => c.conclusionId === conclusionId);
    if (conclusion) {
      alert(`跳转到最终结论: ${conclusion.finalResult}`);
    }
  };

  const handleJumpToVersion = (versionId: string) => {
    const version = versions.find((v) => v.versionId === versionId);
    if (version) {
      alert(`跳转到版本: v${version.versionNumber}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <MessageSquare size={20} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">待复核</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{pendingComments.length}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">已确认结论</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{conclusions.length}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <User size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">涉及样本</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{pendingBarcodes.length}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <ArrowLeftRight size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">双向关联</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{confirmedComments.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lab-card p-4 bg-accent-50 border border-accent-200">
        <div className="flex items-start gap-3">
          <ArrowLeftRight size={20} className="text-accent-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-accent-800 mb-1">复核与结论双向追溯说明</h3>
            <p className="text-sm text-accent-700">
              复核意见和最终结论之间支持双向跳转。每条复核意见可关联到最终结论，
              最终结论也包含所有关联的复核意见。复盘时点击即可跳转，无需人工查表。
              避免同一件事出现多份矛盾结论。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="lab-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lab-text flex items-center gap-2">
                <MessageSquare size={18} className="text-primary-500" />
                复核意见列表
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    activeTab === 'pending'
                      ? 'bg-warning-500 text-white'
                      : 'bg-lab-bg text-lab-text hover:bg-warning-100'
                  )}
                >
                  待处理
                </button>
                <button
                  onClick={() => setActiveTab('confirmed')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    activeTab === 'confirmed'
                      ? 'bg-accent-500 text-white'
                      : 'bg-lab-bg text-lab-text hover:bg-accent-100'
                  )}
                >
                  已确认
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lab-textMuted" size={18} />
                <input
                  type="text"
                  placeholder="搜索条码、意见内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 input-field"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredComments.length > 0 ? (
                filteredComments.map((comment) => {
                  const reviewer = users.find((u) => u.id === comment.reviewedBy);
                  const conclusion = comment.finalConclusionId
                    ? conclusions.find((c) => c.conclusionId === comment.finalConclusionId)
                    : null;
                  const isSelected = selectedComment?.commentId === comment.commentId;

                  return (
                    <button
                      key={comment.commentId}
                      onClick={() => handleSelectComment(comment)}
                      className={cn(
                        'w-full p-3 rounded-lg text-left transition-all',
                        isSelected
                          ? 'bg-primary-50 border-2 border-primary-200 shadow-md'
                          : 'bg-lab-bg border-2 border-transparent hover:bg-primary-50/50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-primary-600">
                          {comment.barcode}
                        </span>
                        {conclusion ? (
                          <span className="tag-accent text-[10px] flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            已关联
                          </span>
                        ) : (
                          <span className="tag-warning text-[10px] flex items-center gap-1">
                            <AlertTriangle size={10} />
                            待关联
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-lab-text line-clamp-2 mb-2">{comment.content}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-lab-textMuted">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {reviewer?.name || '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {dayjs(comment.reviewedAt).format('MM-DD HH:mm')}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <Empty
                  title="暂无复核意见"
                  description="请先录入复核意见"
                  icon={MessageSquare}
                  className="!p-4"
                />
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="lab-card p-4">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary-500" />
              录入复核意见
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-lab-text mb-2">选择样本条码</label>
                <select
                  className="w-full input-field"
                  onChange={(e) => {
                    const comment = comments.find((c) => c.barcode === e.target.value);
                    if (comment) setSelectedComment(comment);
                  }}
                >
                  <option value="">请选择样本条码</option>
                  {pendingBarcodes.map((barcode) => (
                    <option key={barcode} value={barcode}>
                      {barcode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-lab-text mb-2">复核意见</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="请输入复核意见..."
                  className="w-full input-field min-h-[100px]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const barcode = pendingBarcodes[0];
                    if (barcode) handleAddComment(barcode);
                  }}
                  disabled={!newComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  提交复核意见
                </button>
              </div>
            </div>
          </div>

          {selectedComment && (
            <div className="lab-card p-4">
              <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
                <FileText size={18} className="text-accent-500" />
                复核意见详情
              </h3>

              <div className="p-4 bg-lab-bg rounded-lg mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-lg text-primary-600">
                    {selectedComment.barcode}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleJumpToVersion(selectedComment.versionId)}
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <FileText size={12} />
                      查看版本
                      <ExternalLink size={10} />
                    </button>
                    {selectedComment.finalConclusionId && (
                      <button
                        onClick={() => handleJumpToConclusion(selectedComment.finalConclusionId!)}
                        className="flex items-center gap-1 text-xs text-accent-600 hover:underline"
                      >
                        <CheckCircle2 size={12} />
                        查看结论
                        <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-lab-text mb-3">{selectedComment.content}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-lab-textMuted">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {users.find((u) => u.id === selectedComment.reviewedBy)?.name || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {dayjs(selectedComment.reviewedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                </div>
              </div>

              {!selectedComment.finalConclusionId && (
                <button
                  onClick={() => handleLinkToConclusion(selectedComment.commentId, selectedComment.barcode)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-sm font-medium"
                >
                  <ArrowLeftRight size={16} />
                  关联到最终结论
                </button>
              )}
            </div>
          )}

          <div className="lab-card p-4">
            <h3 className="font-medium text-lab-text mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent-500" />
              确认最终结论
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-lab-text mb-2">选择样本条码</label>
                <select
                  className="w-full input-field"
                  onChange={(e) => {
                    if (e.target.value) {
                      const comment = comments.find((c) => c.barcode === e.target.value);
                      if (comment) setSelectedComment(comment);
                    }
                  }}
                >
                  <option value="">请选择样本条码</option>
                  {pendingBarcodes.map((barcode) => (
                    <option key={barcode} value={barcode}>
                      {barcode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-lab-text mb-2">最终结果</label>
                <input
                  type="text"
                  value={newFinalResult}
                  onChange={(e) => setNewFinalResult(e.target.value)}
                  placeholder="例如：阳性/阴性/可疑"
                  className="w-full input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-lab-text mb-2">结论说明</label>
                <textarea
                  value={newConclusion}
                  onChange={(e) => setNewConclusion(e.target.value)}
                  placeholder="请详细说明结论依据..."
                  className="w-full input-field min-h-[100px]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-lab-textMuted">
                  <Sparkles size={12} className="inline mr-1" />
                  确认后将自动关联所有该样本的复核意见
                </div>
                <button
                  onClick={() => {
                    const barcode = pendingBarcodes[0];
                    if (barcode) handleConfirmConclusion(barcode);
                  }}
                  disabled={!newFinalResult.trim() || !newConclusion.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 size={16} />
                  确认最终结论
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
