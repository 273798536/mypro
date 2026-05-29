import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  CreditCard,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  FileText,
  ShoppingBag,
  History,
  Calculator,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusTag } from '@/components/ui/StatusTag';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatMiles } from '@/utils/number';
import { formatDate, formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { LiabilityRecord, MemberAccount, MileageTransaction, ExchangeOrder, OperationLog } from '@/types';

export const LiabilityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [expiredModal, setExpiredModal] = useState(false);
  const [expiredAction, setExpiredAction] = useState<'冲回' | '豁免' | ''>('');
  const [expiredComment, setExpiredComment] = useState('');

  const getLiabilityById = useAppStore((state) => state.getLiabilityById);
  const memberAccounts = useAppStore((state) => state.memberAccounts);
  const transactions = useAppStore((state) => state.transactions);
  const exchangeOrders = useAppStore((state) => state.exchangeOrders);
  const operationLogs = useAppStore((state) => state.operationLogs);
  const markReviewed = useAppStore((state) => state.markReviewed);
  const processExpired = useAppStore((state) => state.processExpired);

  const record = useMemo((): LiabilityRecord | undefined => {
    if (!id) return undefined;
    return getLiabilityById(id);
  }, [id, getLiabilityById]);

  const memberAccount = useMemo((): MemberAccount | undefined => {
    if (!record) return undefined;
    return memberAccounts.find((a) => a.memberNo === record.memberNo);
  }, [record, memberAccounts]);

  const memberTransactions = useMemo((): MileageTransaction[] => {
    if (!record) return [];
    return transactions
      .filter((t) => t.memberNo === record.memberNo)
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [record, transactions]);

  const memberOrders = useMemo((): ExchangeOrder[] => {
    if (!record) return [];
    return exchangeOrders
      .filter((o) => o.memberNo === record.memberNo)
      .sort((a, b) => new Date(b.applyDate).getTime() - new Date(a.applyDate).getTime());
  }, [record, exchangeOrders]);

  const processHistory = useMemo((): OperationLog[] => {
    if (!record) return [];
    return operationLogs.filter((log) => log.targetId === record.id);
  }, [record, operationLogs]);

  const handleReviewSubmit = () => {
    if (!reviewComment.trim()) {
      alert('请填写复核意见');
      return;
    }
    if (record) {
      markReviewed(record.id, reviewComment);
    }
    setReviewModal(false);
    setReviewComment('');
  };

  const handleExpiredSubmit = () => {
    if (!expiredAction) {
      alert('请选择处理方式');
      return;
    }
    if (!expiredComment.trim()) {
      alert('请填写处理意见');
      return;
    }
    if (record) {
      processExpired(record.id, expiredAction, expiredComment);
    }
    setExpiredModal(false);
    setExpiredAction('');
    setExpiredComment('');
  };

  if (!record) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate(-1)} className="mb-6 btn btn-ghost gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="card p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">记录不存在</h2>
          <p className="text-gray-500">未找到指定的负债记录，请检查链接是否正确</p>
        </div>
      </div>
    );
  }

  const totalMiles = memberAccount?.totalMiles || 0;
  const usedMiles = memberAccount?.usedMiles || 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn btn-ghost gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900">负债详情</h1>
            <p className="text-sm text-gray-500 mt-1">
              {record.memberName} ({record.memberNo}) - 完整信息视图
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/trace/${record.id}`)}
            className="btn btn-secondary gap-2"
          >
            <GitBranch className="w-4 h-4" />
            追溯链路
          </button>
          {record.isExpired && record.reviewStatus !== '已冲回' && (
            <button onClick={() => setExpiredModal(true)} className="btn btn-danger gap-2">
              <AlertTriangle className="w-4 h-4" />
              处理过期
            </button>
          )}
          {record.reviewStatus !== '已复核' && record.reviewStatus !== '已冲回' && (
            <button onClick={() => setReviewModal(true)} className="btn btn-success gap-2">
              <CheckCircle2 className="w-4 h-4" />
              一键复核
            </button>
          )}
        </div>
      </div>

      {record.isExpired && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">该记录为过期里程记录</p>
            <p className="text-xs text-red-600 mt-1">
              过期记录默认不参与正常兑付计算，仅供查看和处理。请在"特殊业务复核-里程过期专区"进行处理。
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#1E3A5F]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
                  <p className="text-sm text-gray-500">会员账户概览</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusTag status={record.businessCategory} type="business" />
                <StatusTag status={record.reviewStatus} type="review" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  会员号
                </p>
                <p className="text-sm font-mono text-gray-900">{record.memberNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  会员姓名
                </p>
                <p className="text-sm text-gray-900">{record.memberName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">账户类型</p>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    record.accountType === '白金卡' && 'bg-gray-100 text-gray-700',
                    record.accountType === '金卡' && 'bg-amber-100 text-amber-700',
                    record.accountType === '银卡' && 'bg-slate-100 text-slate-600',
                    record.accountType === '普通' && 'bg-blue-50 text-blue-700'
                  )}
                >
                  {record.accountType}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  注册日期
                </p>
                <p className="text-sm text-gray-900">
                  {memberAccount ? formatDate(memberAccount.createTime) : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">里程信息</h2>
                <p className="text-sm text-gray-500">会员里程账户详情</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-emerald-600">总累积里程</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700 font-mono">
                  {formatMiles(totalMiles)}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-600">已使用里程</p>
                </div>
                <p className="text-2xl font-bold text-amber-700 font-mono">
                  {formatMiles(usedMiles)}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-600">剩余里程</p>
                </div>
                <p className="text-2xl font-bold text-blue-700 font-mono">
                  {formatMiles(record.remainingMiles)}
                </p>
              </div>
              <div
                className={cn(
                  'rounded-lg p-4',
                  record.isExpired ? 'bg-red-50' : 'bg-purple-50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock
                    className={cn('w-4 h-4', record.isExpired ? 'text-red-600' : 'text-purple-600')}
                  />
                  <p
                    className={cn(
                      'text-xs',
                      record.isExpired ? 'text-red-600' : 'text-purple-600'
                    )}
                  >
                    过期日期
                  </p>
                </div>
                <p
                  className={cn(
                    'text-2xl font-bold font-mono',
                    record.isExpired ? 'text-red-700' : 'text-purple-700'
                  )}
                >
                  {formatDate(record.expireDate)}
                </p>
                {record.isExpired && (
                  <p className="text-xs text-red-600 mt-1">已过期</p>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[#1E3A5F]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">负债估算</h2>
                <p className="text-sm text-gray-500">负债计算依据与过程</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] rounded-xl p-6 text-white mb-6">
              <p className="text-sm text-white/70 mb-1">估算负债金额</p>
              <p className="text-4xl font-bold font-mono">
                {formatCurrency(record.estimatedLiability)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">剩余里程</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {formatMiles(record.estimateDetail.parameters.remainingMiles)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">负债系数</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {record.estimateDetail.parameters.liabilityCoefficient}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">概率系数</p>
                <p className="text-lg font-bold text-gray-900 font-mono">
                  {record.estimateDetail.parameters.probabilityCoefficient}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">计算公式</p>
                <p className="text-sm font-mono text-gray-700 bg-white rounded p-3 border border-gray-200">
                  {record.estimateDetail.formula}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">计算过程</p>
                <p className="text-sm font-mono text-[#1E3A5F] font-semibold bg-white rounded p-3 border border-[#1E3A5F]/20">
                  {record.estimateDetail.calculationProcess}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>计算人: {record.estimateDetail.calculator}</span>
              <span>计算时间: {formatDateTime(record.estimateDetail.calculateTime)}</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">最近交易记录</h2>
                <p className="text-sm text-gray-500">该会员的里程变动历史</p>
              </div>
            </div>
            {memberTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">交易日期</th>
                      <th className="table-header">交易类型</th>
                      <th className="table-header">业务类型</th>
                      <th className="table-header text-right">变动里程</th>
                      <th className="table-header">描述</th>
                      <th className="table-header">操作人</th>
                      <th className="table-header">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberTransactions.slice(0, 10).map((transaction) => (
                      <tr key={transaction.id} className="table-row">
                        <td className="table-cell">{formatDate(transaction.transactionDate)}</td>
                        <td className="table-cell">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              transaction.transactionType === '累积' && 'bg-emerald-100 text-emerald-700',
                              transaction.transactionType === '兑换' && 'bg-blue-100 text-blue-700',
                              transaction.transactionType === '过期' && 'bg-red-100 text-red-700',
                              transaction.transactionType === '退回' && 'bg-amber-100 text-amber-700',
                              transaction.transactionType === '调整' && 'bg-purple-100 text-purple-700'
                            )}
                          >
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className="table-cell">{transaction.businessType}</td>
                        <td
                          className={cn(
                            'table-cell text-right font-mono font-medium',
                            transaction.miles >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}
                        >
                          {transaction.miles >= 0 ? '+' : ''}
                          {formatMiles(transaction.miles)}
                        </td>
                        <td className="table-cell max-w-[200px] truncate">{transaction.description}</td>
                        <td className="table-cell">{transaction.operator}</td>
                        <td className="table-cell">
                          <StatusTag status={transaction.status} type="transaction" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>暂无交易记录</p>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">相关兑换订单</h2>
                <p className="text-sm text-gray-500">该会员的里程兑换订单</p>
              </div>
            </div>
            {memberOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">订单编号</th>
                      <th className="table-header">申请日期</th>
                      <th className="table-header">兑换类型</th>
                      <th className="table-header text-right">兑换里程</th>
                      <th className="table-header text-right">兑付金额</th>
                      <th className="table-header">状态</th>
                      <th className="table-header">审核人</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberOrders.map((order) => (
                      <tr key={order.id} className="table-row">
                        <td className="table-cell font-mono text-sm">{order.orderNo}</td>
                        <td className="table-cell">{formatDate(order.applyDate)}</td>
                        <td className="table-cell">{order.exchangeType}</td>
                        <td className="table-cell text-right font-mono">{formatMiles(order.miles)}</td>
                        <td className="table-cell text-right font-mono font-semibold text-[#1E3A5F]">
                          {formatCurrency(order.amount)}
                        </td>
                        <td className="table-cell">
                          <StatusTag status={order.status} type="order" />
                        </td>
                        <td className="table-cell">{order.auditor || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>暂无兑换订单</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <History className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">处理历史</h2>
                <p className="text-sm text-gray-500">操作记录追溯</p>
              </div>
            </div>
            {processHistory.length > 0 ? (
              <div className="relative">
                <div className="timeline-line" style={{ left: '1.25rem', top: '0.5rem' }} />
                {processHistory.map((log, index) => (
                  <div key={log.id} className="relative pl-10 pb-6 last:pb-0">
                    <div
                      className={cn(
                        'timeline-dot',
                        log.operationType === '复核' && 'bg-emerald-500',
                        log.operationType === '冲回' && 'bg-red-500',
                        log.operationType === '导入' && 'bg-blue-500',
                        log.operationType === '刷新' && 'bg-amber-500',
                        log.operationType === '修改' && 'bg-purple-500',
                        !['复核', '冲回', '导入', '刷新', '修改'].includes(log.operationType) &&
                          'bg-gray-500'
                      )}
                      style={{ top: '0' }}
                    />
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900">
                          {log.operationType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(log.createTime)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">操作人: {log.operator}</p>
                      <p className="text-xs text-gray-700 mt-1">{log.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>暂无处理历史</p>
              </div>
            )}
          </div>

          {record.reviewer && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">复核信息</h3>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">复核人</p>
                  <p className="text-sm text-gray-900">{record.reviewer}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">复核时间</p>
                  <p className="text-sm text-gray-900">
                    {record.reviewTime ? formatDateTime(record.reviewTime) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">复核意见</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                    {record.reviewComment || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {record.expireRecords && record.expireRecords.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">过期记录</h3>
                </div>
              </div>
              <div className="space-y-3">
                {record.expireRecords.map((expire) => (
                  <div key={expire.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500">{expire.batchNo}</span>
                      <StatusTag status={expire.processStatus} type="process" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">过期日期: </span>
                        <span className="text-gray-700">{formatDate(expire.expireDate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">应过期: </span>
                        <span className="text-gray-700 font-mono">
                          {formatMiles(expire.milesToExpire)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">实过期: </span>
                        <span className="text-red-600 font-mono">
                          {formatMiles(expire.actualExpiredMiles)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">状态: </span>
                        <span className="text-gray-700">{expire.isExpired ? '已过期' : '未过期'}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{expire.expireReason}</p>
                    {expire.processor && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          处理人: {expire.processor} | {formatDateTime(expire.processTime || '')}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[#1E3A5F]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">数据追溯</h3>
                <p className="text-xs text-gray-500">查看完整追溯链路</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/trace/${record.id}`)}
              className="w-full btn btn-primary justify-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              查看追溯链路
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              追溯链路包含负债估算、兑换状态、过期冲回等完整节点信息
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        title="复核确认"
        size="md"
        footer={
          <>
            <button onClick={() => setReviewModal(false)} className="btn btn-ghost">
              取消
            </button>
            <button onClick={handleReviewSubmit} className="btn btn-success">
              确认复核
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">即将对该条记录进行复核标记</p>
          </div>
          <div>
            <label className="label">复核意见</label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="请输入复核意见，例如：数据一致，复核通过"
              className="input min-h-[120px] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              复核完成后，系统将自动记录复核人和复核时间
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={expiredModal}
        onClose={() => setExpiredModal(false)}
        title="处理过期里程"
        size="lg"
        footer={
          <>
            <button onClick={() => setExpiredModal(false)} className="btn btn-ghost">
              取消
            </button>
            <button onClick={handleExpiredSubmit} className="btn btn-primary">
              确认处理
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">会员号</p>
              <p className="font-mono font-medium">{record.memberNo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">会员姓名</p>
              <p className="font-medium">{record.memberName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">过期里程</p>
              <p className="font-mono font-semibold text-red-600">
                {formatMiles(record.remainingMiles)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">对应负债</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(record.estimatedLiability)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">过期日期</p>
              <p className="font-medium text-red-600">{formatDate(record.expireDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">负债估算依据</p>
              <p className="text-xs text-gray-600 mt-1">
                单位里程负债系数: {record.liabilityCoefficient.toFixed(4)}
                <br />
                兑换概率系数: {record.probabilityCoefficient.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <label className="label mb-3">选择处理方式</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setExpiredAction('冲回')}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  expiredAction === '冲回'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <XCircle
                    className={cn(
                      'w-5 h-5',
                      expiredAction === '冲回' ? 'text-red-500' : 'text-gray-400'
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        expiredAction === '冲回' ? 'text-red-700' : 'text-gray-900'
                      )}
                    >
                      冲回
                    </p>
                    <p className="text-xs text-gray-500">里程已过期，冲销对应负债</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setExpiredAction('豁免')}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  expiredAction === '豁免'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <RotateCcw
                    className={cn(
                      'w-5 h-5',
                      expiredAction === '豁免' ? 'text-emerald-500' : 'text-gray-400'
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        expiredAction === '豁免' ? 'text-emerald-700' : 'text-gray-900'
                      )}
                    >
                      豁免
                    </p>
                    <p className="text-xs text-gray-500">特殊情况，豁免过期里程</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="label">处理意见</label>
            <textarea
              value={expiredComment}
              onChange={(e) => setExpiredComment(e.target.value)}
              placeholder={
                expiredAction === '冲回'
                  ? '请说明冲回原因，例如：里程已过期，按照规则冲销负债'
                  : '请说明豁免原因，例如：会员特殊申请，批准豁免'
              }
              className="input min-h-[100px] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              处理完成后，系统将自动记录追溯链路，包含操作人、操作时间和处理意见
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
