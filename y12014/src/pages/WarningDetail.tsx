import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ClipboardCheck, FileCheck, GitBranch, MessageSquare, Send } from 'lucide-react';
import { useWarningStore } from '../store/warningStore';
import { typeLabels, typeColors, levelColors, statusLabels, statusColors, formatMoney, formatDate, formatDateTime, formatPercent } from '../utils/format';
import type { WarningStatus } from '../../shared/types';

export default function WarningDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWarning, traceNodes, isLoading, fetchWarningDetail, fetchTraceNodes, submitReview } = useWarningStore();
  
  const [reviewResult, setReviewResult] = useState<WarningStatus>('confirmed');
  const [reviewOpinion, setReviewOpinion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWarningDetail(id);
      fetchTraceNodes(id);
    }
  }, [id, fetchWarningDetail, fetchTraceNodes]);

  const handleSubmitReview = async () => {
    if (!id || !reviewOpinion.trim()) return;
    
    setIsSubmitting(true);
    const success = await submitReview(id, reviewResult, reviewOpinion);
    if (success) {
      setReviewOpinion('');
    }
    setIsSubmitting(false);
  };

  if (isLoading && !currentWarning) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentWarning) {
    return (
      <div className="text-center py-12 text-gray-500">
        预警记录不存在
      </div>
    );
  }

  const { receipt, inspections, contracts, reviews } = currentWarning;
  const latestInspection = inspections[inspections.length - 1];
  const isQualityMismatch = currentWarning.type === 'quality_downgrade';
  const isDuplicate = currentWarning.type === 'duplicate_receipt';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                返回列表
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">预警详情 - {currentWarning.id}</h1>
                <p className="text-sm text-gray-500">{currentWarning.receiptNo} | {currentWarning.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded border ${typeColors[currentWarning.type]}`}>
                {typeLabels[currentWarning.type]}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${levelColors[currentWarning.level]}`}></span>
                <span className="text-sm text-gray-700">{currentWarning.level === 'high' ? '高风险' : currentWarning.level === 'medium' ? '中风险' : '低风险'}</span>
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${statusColors[currentWarning.status]}`}>
                {statusLabels[currentWarning.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">预警描述</h2>
          <p className="text-gray-900">{currentWarning.description}</p>
          <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
            <span>预警时间：{formatDateTime(currentWarning.warningTime)}</span>
            <span className="text-red-600 font-medium">风险敞口：¥{formatMoney(currentWarning.riskAmount)}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-800">三档数据对齐视图</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">仓单档案</h3>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">仓单编号</dt>
                  <dd className="font-mono text-gray-900">{receipt.receiptNo}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">客户名称</dt>
                  <dd className="text-gray-900">{receipt.customerName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">货物名称</dt>
                  <dd className="text-gray-900">{receipt.goodsName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">数量</dt>
                  <dd className="text-gray-900">{receipt.quantity} {receipt.unit}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">存放仓库</dt>
                  <dd className="text-gray-900">{receipt.warehouse}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">入库日期</dt>
                  <dd className="text-gray-900">{formatDate(receipt.storageDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">到期日期</dt>
                  <dd className="text-gray-900">{formatDate(receipt.expiryDate)}</dd>
                </div>
                <div className={`flex justify-between p-2 rounded ${receipt.status !== 'normal' ? 'bg-red-50' : ''}`}>
                  <dt className="text-gray-500">仓单状态</dt>
                  <dd className={receipt.status !== 'normal' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    {receipt.status === 'normal' ? '正常' : receipt.status === 'duplicate' ? '重复质押' : receipt.status}
                  </dd>
                </div>
                {isDuplicate && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    ⚠️ 该仓单对应 {contracts.length} 笔质押合同，存在重复质押风险
                  </div>
                )}
              </dl>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">质检报告</h3>
              </div>
              {latestInspection && (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">质检日期</dt>
                    <dd className="text-gray-900">{formatDate(latestInspection.inspectionDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">质检员</dt>
                    <dd className="text-gray-900">{latestInspection.inspector}</dd>
                  </div>
                  <div className={`flex justify-between p-2 rounded ${isQualityMismatch ? 'bg-red-50' : ''}`}>
                    <dt className="text-gray-500">质量等级</dt>
                    <dd className={`font-semibold ${isQualityMismatch ? 'text-red-600' : 'text-gray-900'}`}>
                      {latestInspection.qualityGrade}级
                      {latestInspection.previousGrade && (
                        <span className="text-red-500 ml-2">（由{latestInspection.previousGrade}级降级）</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">质量评分</dt>
                    <dd className="text-gray-900">{latestInspection.qualityScore}分</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">水分含量</dt>
                    <dd className="text-gray-900">{latestInspection.moistureContent}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">杂质含量</dt>
                    <dd className="text-gray-900">{latestInspection.impurityContent}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">容重</dt>
                    <dd className="text-gray-900">{latestInspection.unitWeight}g/L</dd>
                  </div>
                  {latestInspection.remarks && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <dt className="text-gray-500 mb-1">质检备注</dt>
                      <dd className="text-gray-700">{latestInspection.remarks}</dd>
                    </div>
                  )}
                </dl>
              )}
              {inspections.length > 1 && (
                <div className="mt-4 text-sm text-gray-500">
                  共 {inspections.length} 次质检记录
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-800">质押合同</h3>
              </div>
              <div className="space-y-4">
                {contracts.map((contract, idx) => (
                  <div key={contract.id} className={idx > 0 ? 'pt-4 border-t border-gray-200' : ''}>
                    <div className="text-xs text-gray-500 mb-2">合同 {idx + 1}</div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">合同编号</dt>
                        <dd className="font-mono text-gray-900">{contract.contractNo}</dd>
                      </div>
                      <div className={`flex justify-between p-1.5 rounded ${isQualityMismatch ? 'bg-red-50' : ''}`}>
                        <dt className="text-gray-500">约定等级</dt>
                        <dd className={`font-semibold ${isQualityMismatch ? 'text-red-600' : 'text-gray-900'}`}>
                          {contract.agreedGrade}级
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">质押数量</dt>
                        <dd className="text-gray-900">{contract.pledgedQuantity} {contract.unit}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">质押率</dt>
                        <dd className="text-gray-900">{formatPercent(contract.pledgeRate)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">原始单价</dt>
                        <dd className="text-gray-900">¥{contract.originalUnitPrice}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">当前单价</dt>
                        <dd className={contract.currentUnitPrice < contract.originalUnitPrice ? 'text-red-600' : 'text-gray-900'}>
                          ¥{contract.currentUnitPrice}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">质押金额</dt>
                        <dd className="text-gray-900">¥{formatMoney(contract.pledgedAmount)}</dd>
                      </div>
                      <div className="flex justify-between font-medium">
                        <dt className="text-gray-500">剩余本金</dt>
                        <dd className="text-red-600">¥{formatMoney(contract.remainingPrincipal)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
              {isQualityMismatch && latestInspection && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  ⚠️ 等级不匹配：合同约定{contracts[0]?.agreedGrade}级，实际质检{latestInspection.qualityGrade}级
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-orange-500" />
              <h2 className="font-semibold text-gray-800">风险追溯链路</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="relative">
              {traceNodes.map((node, index) => (
                <div key={node.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < traceNodes.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200"></div>
                  )}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    node.type === 'warning' ? 'bg-red-100 text-red-600' :
                    node.type === 'valuation' ? 'bg-blue-100 text-blue-600' :
                    node.type === 'limit' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {node.type === 'warning' && '!'}
                    {node.type === 'valuation' && '¥'}
                    {node.type === 'limit' && '%'}
                    {node.type === 'status' && '✓'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-800">{node.title}</h3>
                      <span className="text-xs text-gray-500">{formatDateTime(node.time)}</span>
                    </div>
                    <p className="text-gray-700 mb-3">{node.description}</p>
                    {node.previousValue !== undefined && node.currentValue !== undefined && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">变更前：<span className="text-gray-700 font-mono">¥{formatMoney(node.previousValue)}</span></span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-500">变更后：<span className="text-red-600 font-mono font-medium">¥{formatMoney(node.currentValue)}</span></span>
                      </div>
                    )}
                    {node.data.suggestion && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
                        💡 {node.data.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-gray-800">复核记录</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">提交复核意见</h3>
              <div className="flex flex-wrap gap-4 mb-3">
                {[
                  { value: 'confirmed', label: '确认风险', color: 'text-red-600 border-red-200 bg-red-50' },
                  { value: 'dismissed', label: '排除风险', color: 'text-green-600 border-green-200 bg-green-50' },
                  { value: 'pending_info', label: '待补充材料', color: 'text-yellow-600 border-yellow-200 bg-yellow-50' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReviewResult(opt.value as WarningStatus)}
                    className={`px-4 py-2 rounded border text-sm font-medium transition-colors ${
                      reviewResult === opt.value 
                        ? opt.color 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewOpinion}
                onChange={(e) => setReviewOpinion(e.target.value)}
                placeholder="请输入复核意见..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                rows={3}
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleSubmitReview}
                  disabled={!reviewOpinion.trim() || isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? '提交中...' : '提交复核'}
                </button>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium shrink-0">
                      {review.reviewer.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{review.reviewer}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${statusColors[review.result]}`}>
                          {statusLabels[review.result]}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(review.reviewTime)}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{review.opinion}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                暂无复核记录
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
