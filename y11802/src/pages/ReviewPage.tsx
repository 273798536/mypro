import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, ChevronRight, Check, X, AlertTriangle, Layers } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { getStatusColor, getStatusText, formatAmount, formatDate } from '@/utils/formatters';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { redemptions, approveReview, rejectReview } = useRedemptionStore();
  const [activeTab, setActiveTab] = useState<'partial' | 'multiple'>('partial');
  const [operator, setOperator] = useState('运营专员');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const partialReviews = redemptions.filter(r => r.needsReview && r.reviewType === 'partial');
  const multipleReviews = redemptions.filter(r => r.needsReview && r.reviewType === 'multiple');

  const customerGroups = multipleReviews.reduce((groups, r) => {
    if (!groups[r.customerId]) {
      groups[r.customerId] = [];
    }
    groups[r.customerId].push(r);
    return groups;
  }, {} as Record<string, typeof multipleReviews>);

  const handleApprove = (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      approveReview(id, operator, '复核通过');
      setProcessingId(null);
    }, 300);
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) return;
    setProcessingId(id);
    setTimeout(() => {
      rejectReview(id, operator, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      setProcessingId(null);
    }, 300);
  };

  const handleGroupApprove = (customerId: string) => {
    const items = customerGroups[customerId];
    items.forEach(item => {
      approveReview(item.id, operator, '同客户多笔申请复核通过');
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-6 py-4 border-b border-slate-700 bg-slate-850">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">复核工作台</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              处理部分确认和同客户多笔申请的复核
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-400">
              操作人：
              <input
                type="text"
                value={operator}
                onChange={e => setOperator(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm w-28"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 px-6 py-3 border-b border-slate-700 bg-slate-850/50">
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('partial')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'partial'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              部分确认复核
              {partialReviews.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-xs font-bold rounded-full">
                  {partialReviews.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('multiple')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'multiple'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              多笔申请复核
              {multipleReviews.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                  {multipleReviews.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6">
        {activeTab === 'partial' ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            {partialReviews.length === 0 ? (
              <div className="text-center py-12">
                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-400">暂无部分确认复核项</p>
              </div>
            ) : (
              partialReviews.map(redemption => (
                <div key={redemption.id} className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-300">{redemption.id}</span>
                          <span className={`status-pill ${getStatusColor(redemption.status)}`}>
                            {getStatusText(redemption.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">
                          {redemption.customerName} · {redemption.fundName}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/detail/${redemption.id}`)}
                      className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      查看详情
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-800 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-400">申请份额</p>
                      <p className="font-mono text-lg text-white font-semibold">
                        {formatAmount(redemption.requestAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">确认份额</p>
                      <p className="font-mono text-lg text-amber-400 font-semibold">
                        {formatAmount(redemption.confirmedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">扣减份额</p>
                      <p className="font-mono text-lg text-red-400 font-semibold">
                        {formatAmount(redemption.requestAmount - redemption.confirmedAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      申请日期：{formatDate(redemption.applyDate)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRejectModal(redemption.id)}
                        disabled={processingId === redemption.id}
                        className="btn-danger flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        驳回
                      </button>
                      <button
                        onClick={() => handleApprove(redemption.id)}
                        disabled={processingId === redemption.id}
                        className="btn-success flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        通过
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {Object.keys(customerGroups).length === 0 ? (
              <div className="text-center py-12">
                <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-400">暂无可合并复核项</p>
              </div>
            ) : (
              Object.entries(customerGroups).map(([customerId, items]) => {
                const customerName = items[0].customerName;
                const totalRequestAmount = items.reduce((sum, r) => sum + r.requestAmount, 0);
                const totalConfirmedAmount = items.reduce((sum, r) => sum + r.confirmedAmount, 0);

                return (
                  <div key={customerId} className="card p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{customerName}</p>
                          <p className="text-sm text-slate-400">
                            {items.length} 笔申请 · 客户号 {customerId}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-4 mb-4 space-y-3">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm text-slate-300">{item.id}</span>
                            <span className={`status-pill text-xs ${getStatusColor(item.status)}`}>
                              {getStatusText(item.status)}
                            </span>
                            <span className="text-sm text-slate-400">{item.fundName}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm text-white">
                              申请 {formatAmount(item.requestAmount)}
                            </span>
                            <button
                              onClick={() => navigate(`/detail/${item.id}`)}
                              className="text-xs text-primary-400 hover:text-primary-300"
                            >
                              详情
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                      <div>
                        <p className="text-xs text-slate-400">申请合计</p>
                        <p className="font-mono text-lg text-white font-semibold">
                          {formatAmount(totalRequestAmount)} 份
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">确认合计</p>
                        <p className="font-mono text-lg text-emerald-400 font-semibold">
                          {formatAmount(totalConfirmedAmount)} 份
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">笔数</p>
                        <p className="font-mono text-lg text-white font-semibold">
                          {items.length} 笔
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleGroupApprove(customerId)}
                        className="btn-success flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        全部通过
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-850 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">驳回复核</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="label">驳回原因 <span className="text-red-400">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="input-field min-h-[100px] resize-none"
                  placeholder="请详细说明驳回原因..."
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={!rejectReason.trim()}
                  className="btn-danger"
                >
                  确认驳回
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
