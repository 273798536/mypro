import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, CheckCircle, XCircle, Clock, FileText, History, User, Calendar, UserCheck, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';

import { useStore } from '../store/useStore';
import { formatCurrency, formatMileage, getAnomalyTypeLabel } from '../utils/calculator';
import { getCabinName } from '../utils/mockData';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import type { AuditLog } from '../types';

const RebookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rebookRecords, reviewRebook, settleRebook, currentUser, loadRebookRecords, getAuditLogs } = useStore();
  const [record, setRecord] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isGeneratingShareCard, setIsGeneratingShareCard] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRebookRecords();
  }, [loadRebookRecords]);

  useEffect(() => {
    if (id) {
      const found = rebookRecords.find(r => r.id === id);
      if (found) {
        setRecord(found);
        loadLogs(found.id);
      }
    }
  }, [id, rebookRecords]);

  const loadLogs = async (recordId: string) => {
    const logs = await getAuditLogs(recordId);
    setAuditLogs(logs);
  };

  const handleApprove = async () => {
    if (!record) return;
    await reviewRebook(record.id, true, reviewComment, currentUser?.name || 'system');
    setShowApproveModal(false);
    setReviewComment('');
    navigate('/review');
  };

  const handleReject = async () => {
    if (!record) return;
    await reviewRebook(record.id, false, reviewComment, currentUser?.name || 'system');
    setShowRejectModal(false);
    setReviewComment('');
    navigate('/review');
  };

  const handleSettle = async () => {
    if (!record) return;
    await settleRebook(record.id, currentUser?.name || 'system');
  };

  const handleGenerateShareCard = async () => {
    if (!shareCardRef.current) return;
    setIsGeneratingShareCard(true);

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      link.download = `改签记录-${record?.orderNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('生成分享卡失败:', error);
    } finally {
      setIsGeneratingShareCard(false);
      setShowShareModal(false);
    }
  };

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  const statusActions = () => {
    if (record.status === 'pending' && currentUser?.role === 'reviewer') {
      return (
        <>
          <button
            onClick={() => setShowApproveModal(true)}
            className="btn btn-success gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            审核通过
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            className="btn btn-danger gap-2"
          >
            <XCircle className="w-4 h-4" />
            审核驳回
          </button>
        </>
      );
    }

    if (record.status === 'approved' && currentUser?.role === 'settlement') {
      return (
        <button
          onClick={handleSettle}
          className="btn btn-primary gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          完成结算
        </button>
      );
    }

    if (record.status === 'draft') {
      return (
        <button
          onClick={() => navigate(`/rebook/${record.id}`)}
          className="btn btn-secondary gap-2"
        >
          <FileText className="w-4 h-4" />
          继续编辑
        </button>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-800">改签差价详情</h1>
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm text-slate-500">
                订单号：{record.orderNo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="btn btn-secondary gap-2"
            >
              <History className="w-4 h-4" />
              操作日志
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="btn btn-secondary gap-2"
            >
              <Share2 className="w-4 h-4" />
              分享记录
            </button>
            {statusActions()}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              基本信息
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">订单号</span>
                <span className="font-medium text-slate-800">{record.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">创建人</span>
                <span className="font-medium text-slate-800">{record.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">创建时间</span>
                <span className="font-medium text-slate-800">
                  {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
              {record.submittedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">提交时间</span>
                  <span className="font-medium text-slate-800">
                    {dayjs(record.submittedAt).format('YYYY-MM-DD HH:mm')}
                  </span>
                </div>
              )}
              {record.reviewedAt && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">复核人</span>
                    <span className="font-medium text-slate-800">{record.reviewedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">复核时间</span>
                    <span className="font-medium text-slate-800">
                      {dayjs(record.reviewedAt).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">数据来源</span>
                <span className="font-medium text-slate-800">{record.dataSource.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">版本号</span>
                <span className="font-mono text-slate-800">v{record.version}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              差价汇总
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500 mb-1">舱位差价</div>
                  <div className={`text-lg font-bold ${record.fareDifference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'}`}>
                    {record.fareDifference >= 0 ? '+' : ''}{formatCurrency(record.fareDifference)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500 mb-1">税费差价</div>
                  <div className={`text-lg font-bold ${record.taxDifference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'}`}>
                    {record.taxDifference >= 0 ? '+' : ''}{formatCurrency(record.taxDifference)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-500 mb-1">里程调整</div>
                  <div className={`text-lg font-bold ${record.mileageRefund >= 0 ? 'text-accent-green-600' : 'text-accent-red-600'}`}>
                    {record.mileageRefund >= 0 ? '+' : ''}{formatCurrency(record.mileageRefund)}
                  </div>
                </div>
                <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                  <div className="text-sm text-primary-600 mb-1">应收差价</div>
                  <div className={`text-xl font-bold ${record.totalDifference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'}`}>
                    {record.totalDifference >= 0 ? '+' : ''}{formatCurrency(record.totalDifference)}
                  </div>
                </div>
              </div>

              {record.originalMileageUsed > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <div className="text-slate-500">
                    原里程抵扣：{formatMileage(record.originalMileageUsed)} → {formatMileage(record.newMileageUsed)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">航段对比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">航段</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">航班</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">航线</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">舱位</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">舱位价格</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">税费</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">国家</th>
                </tr>
              </thead>
              <tbody>
                {record.originalSegments.map((seg: any, idx: number) => (
                  <React.Fragment key={seg.id}>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500" rowSpan={2}>
                        第 {idx + 1} 航段
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="text-slate-400 text-xs">原</span> {seg.flightNo}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{seg.departureAirport} → {seg.arrivalAirport}</td>
                      <td className="px-4 py-3">{getCabinName(seg.cabinClass)} ({seg.cabinCode})</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(seg.baseFare)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(seg.taxes.reduce((s: number, t: any) => s + t.amount, 0))}</td>
                      <td className="px-4 py-3">{seg.country}</td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-600">
                        <span className="text-primary-500 text-xs">新</span> {record.newSegments[idx]?.flightNo}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {record.newSegments[idx]?.departureAirport} → {record.newSegments[idx]?.arrivalAirport}
                      </td>
                      <td className="px-4 py-2">
                        {getCabinName(record.newSegments[idx]?.cabinClass)} ({record.newSegments[idx]?.cabinCode})
                      </td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrency(record.newSegments[idx]?.baseFare || 0)}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrency(record.newSegments[idx]?.taxes.reduce((s: number, t: any) => s + t.amount, 0))}</td>
                      <td className="px-4 py-2">{record.newSegments[idx]?.country}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {record.anomalies.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent-amber-500" />
              异常项及解释
            </h3>
            <div className="space-y-4">
              {record.anomalies.map((anomaly: any) => {
                const explanation = record.explanations.find((e: any) => e.anomalyId === anomaly.id);
                return (
                  <div
                    key={anomaly.id}
                    className={`border-l-4 p-4 rounded-r-lg ${
                      anomaly.severity === 'error'
                        ? 'bg-accent-red-50 border-accent-red-500'
                        : 'bg-accent-amber-50 border-accent-amber-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        anomaly.severity === 'error' ? 'bg-accent-red-100 text-accent-red-700' : 'bg-accent-amber-100 text-accent-amber-700'
                      }`}>
                        {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{anomaly.description}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          影响：{anomaly.affectedResults.join('、')} | 金额影响：{formatCurrency(anomaly.amountImpact)} | 规则依据：{anomaly.ruleBasis}
                        </div>
                        {explanation && (
                          <div className="mt-2 p-2 bg-white rounded">
                            <div className="text-xs text-slate-600">
                              <span className="font-medium">解释说明：</span>
                              {explanation.content}
                              <span className="text-slate-400 ml-2">
                                — {explanation.explainedBy} ({dayjs(explanation.createdAt).format('MM-DD HH:mm')})
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card p-6">
          <h3 className="font-semibold text-slate-800 mb-4">计算明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 font-medium text-slate-600">项目</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">原金额</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">新金额</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-600">差额</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">备注</th>
                </tr>
              </thead>
              <tbody>
                {record.calculationDetails.map((detail: any, idx: number) => (
                  <tr key={detail.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 text-slate-700">{detail.item}</td>
                    <td className="px-4 py-2 text-right text-slate-600 font-mono">{formatCurrency(detail.originalAmount)}</td>
                    <td className="px-4 py-2 text-right text-slate-600 font-mono">{formatCurrency(detail.newAmount)}</td>
                    <td className={`px-4 py-2 text-right font-mono font-medium ${
                      detail.difference >= 0 ? 'text-accent-red-600' : 'text-accent-green-600'
                    }`}>
                      {detail.difference >= 0 ? '+' : ''}{formatCurrency(detail.difference)}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{detail.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {record.reviewComment && (
          <div className="card p-6 border-l-4 border-primary-500">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary-600" />
              复核意见
            </h3>
            <p className="text-slate-600">{record.reviewComment}</p>
          </div>
        )}
      </div>

      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="确认审核通过" size="md">
        <div className="space-y-4">
          <p className="text-slate-600">确认通过该改签差价记录的复核？</p>
          <div>
            <label className="label">复核意见（可选）</label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="请输入复核意见..."
              className="input min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowApproveModal(false)} className="btn btn-secondary">取消</button>
            <button onClick={handleApprove} className="btn btn-success">确认通过</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="确认审核驳回" size="md">
        <div className="space-y-4">
          <p className="text-slate-600">确认驳回该改签差价记录的复核？</p>
          <div>
            <label className="label">驳回原因（必填）</label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="请输入驳回原因..."
              className="input min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary">取消</button>
            <button
              onClick={handleReject}
              disabled={!reviewComment.trim()}
              className="btn btn-danger disabled:opacity-50"
            >
              确认驳回
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="生成分享记录卡" size="lg">
        <div className="space-y-4">
          <div ref={shareCardRef} className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">航司联程改签差价记录</h3>
              <p className="text-sm text-slate-500">订单号：{record.orderNo}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-slate-500">舱位差价</div>
                <div className={`text-lg font-bold ${record.fareDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.fareDifference >= 0 ? '+' : ''}{formatCurrency(record.fareDifference)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">税费差价</div>
                <div className={`text-lg font-bold ${record.taxDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.taxDifference >= 0 ? '+' : ''}{formatCurrency(record.taxDifference)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">里程调整</div>
                <div className={`text-lg font-bold ${record.mileageRefund >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {record.mileageRefund >= 0 ? '+' : ''}{formatCurrency(record.mileageRefund)}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500">应收差价</div>
                <div className={`text-lg font-bold ${record.totalDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {record.totalDifference >= 0 ? '+' : ''}{formatCurrency(record.totalDifference)}
                </div>
              </div>
            </div>
            <div className="text-center text-xs text-slate-400">
              <p>状态：{record.status === 'approved' ? '已通过' : record.status === 'settled' ? '已结算' : '待复核'}</p>
              <p>生成时间：{dayjs().format('YYYY-MM-DD HH:mm')}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowShareModal(false)} className="btn btn-secondary">取消</button>
            <button
              onClick={handleGenerateShareCard}
              disabled={isGeneratingShareCard}
              className="btn btn-primary gap-2"
            >
              <Download className="w-4 h-4" />
              {isGeneratingShareCard ? '生成中...' : '下载图片'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="操作日志" size="md">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="text-center text-slate-500 py-8">暂无操作日志</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-800">{log.action}</div>
                  <div className="text-xs text-slate-500">
                    {log.operator} · {dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                  {log.newValue && (
                    <div className="text-xs text-slate-500 mt-1">{log.newValue}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RebookDetail;
