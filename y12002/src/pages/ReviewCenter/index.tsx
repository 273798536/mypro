import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Gift,
  Clock3,
  Eye,
  GitBranch,
  FileText,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusTag } from '@/components/ui/StatusTag';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatMiles } from '@/utils/number';
import { formatDate, formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { LiabilityRecord } from '@/types';

const tabs = [
  { key: 'expired', label: '里程过期专区', icon: Clock3, countKey: 'expiredRecords' },
  { key: 'upgradeRefund', label: '升舱退回', icon: RotateCcw, countKey: 'upgradeRefundRecords' },
  { key: 'doublePoints', label: '活动双倍积分', icon: Gift, countKey: 'doublePointsRecords' },
  { key: 'pending', label: '待复核记录', icon: Clock, countKey: 'pendingRecords' },
];

export const ReviewCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expired');
  const [searchTerm, setSearchTerm] = useState('');
  const [expiredModal, setExpiredModal] = useState<{ isOpen: boolean; record: LiabilityRecord | null }>({
    isOpen: false,
    record: null,
  });
  const [expiredAction, setExpiredAction] = useState<'冲回' | '豁免' | ''>('');
  const [expiredComment, setExpiredComment] = useState('');

  const records = useAppStore((state) => state.liabilityRecords);
  const getExpiredRecords = useAppStore((state) => state.getExpiredRecords);
  const expiredRecords = getExpiredRecords();
  const processExpired = useAppStore((state) => state.processExpired);
  const markReviewed = useAppStore((state) => state.markReviewed);

  const stats = useMemo(() => {
    return {
      expiredRecords: expiredRecords.length,
      upgradeRefundRecords: records.filter(r => r.businessCategory === '升舱退回').length,
      doublePointsRecords: records.filter(r => r.businessCategory === '活动双倍').length,
      pendingRecords: records.filter(r => r.reviewStatus === '未复核' && !r.isExpired).length,
    };
  }, [records, expiredRecords]);

  const displayRecords = useMemo(() => {
    let filtered: LiabilityRecord[] = [];
    
    switch (activeTab) {
      case 'expired':
        filtered = expiredRecords;
        break;
      case 'upgradeRefund':
        filtered = records.filter(r => r.businessCategory === '升舱退回');
        break;
      case 'doublePoints':
        filtered = records.filter(r => r.businessCategory === '活动双倍');
        break;
      case 'pending':
        filtered = records.filter(r => r.reviewStatus === '未复核' && !r.isExpired);
        break;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.memberNo.toLowerCase().includes(term) ||
        r.memberName.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [activeTab, records, expiredRecords, searchTerm]);

  const handleExpiredSubmit = () => {
    if (!expiredModal.record) return;
    if (!expiredAction) {
      alert('请选择处理方式');
      return;
    }
    if (!expiredComment.trim()) {
      alert('请填写处理意见');
      return;
    }

    processExpired(expiredModal.record.id, expiredAction, expiredComment);
    setExpiredModal({ isOpen: false, record: null });
    setExpiredAction('');
    setExpiredComment('');
  };

  const handleQuickReview = (record: LiabilityRecord) => {
    const comment = activeTab === 'upgradeRefund'
      ? '升舱退回已复核，里程已恢复'
      : activeTab === 'doublePoints'
      ? '活动双倍积分已复核，计算正确'
      : '复核通过';
    markReviewed(record.id, comment);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-gray-900">
          特殊业务复核中心
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          处理里程过期、升舱退回、活动双倍积分等特殊业务
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const count = stats[tab.countKey as keyof typeof stats];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                isActive
                  ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  isActive ? 'bg-[#1E3A5F]' : 'bg-gray-100'
                )}>
                  <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-gray-500')} />
                </div>
                <div>
                  <p className={cn('font-medium', isActive ? 'text-[#1E3A5F]' : 'text-gray-900')}>
                    {tab.label}
                  </p>
                  <p className={cn('text-2xl font-bold mt-1', count > 0 ? 'text-red-600' : 'text-gray-400')}>
                    {count}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeTab === 'expired' && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">
              ⚠️ 里程过期专区 - 过期记录不参与正常兑付计算
            </p>
            <p className="text-xs text-red-600 mt-1">
              请仔细核实每一条过期记录。可选择冲销负债或延长有效期。所有操作将自动记录追溯链路。
              测试会员号 <span className="font-mono bg-red-100 px-1 rounded">TEST-2024-EXPIRE</span> 可用于验证过期失败路径。
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索会员号、姓名..."
              className="input pl-10 w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500">
            共 {displayRecords.length} 条记录
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">会员号</th>
                <th className="table-header">会员姓名</th>
                <th className="table-header text-right">剩余里程</th>
                <th className="table-header text-right">估算负债</th>
                <th className="table-header">过期日期</th>
                <th className="table-header">业务类型</th>
                <th className="table-header">复核状态</th>
                <th className="table-header">处理记录</th>
                <th className="table-header text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-12 h-12 text-gray-300" />
                      <p>暂无需要处理的记录</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRecords.map((record, idx) => {
                  const isTestAccount = record.memberNo === 'TEST-2024-EXPIRE';
                  return (
                    <tr
                      key={record.id}
                      className={cn(
                        'table-row animate-fade-in',
                        isTestAccount && 'bg-yellow-50/50'
                      )}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="table-cell font-mono text-sm">
                        <div className="flex items-center gap-2">
                          {record.memberNo}
                          {isTestAccount && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded">
                              测试账户
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">{record.memberName}</td>
                      <td className="table-cell text-right font-mono">
                        {formatMiles(record.remainingMiles)}
                      </td>
                      <td className="table-cell text-right font-semibold text-[#1E3A5F]">
                        {formatCurrency(record.estimatedLiability)}
                      </td>
                      <td className="table-cell">
                        <span className={cn(
                          record.isExpired && 'text-red-600 font-medium'
                        )}>
                          {formatDate(record.expireDate)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <StatusTag status={record.businessCategory} type="business" />
                      </td>
                      <td className="table-cell">
                        <StatusTag status={record.reviewStatus} type="review" />
                      </td>
                      <td className="table-cell max-w-[200px]">
                        {record.reviewTime ? (
                          <div className="text-xs">
                            <span className="text-gray-500">{formatDate(record.reviewTime)}</span>
                            <span className="mx-1">-</span>
                            <span>{record.reviewStatus}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">未处理</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/liability/${record.id}`)}
                            className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-[#1E3A5F]/10 rounded"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/trace/${record.id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="追溯链路"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                          {activeTab === 'expired' && record.reviewStatus !== '已冲回' && (
                            <button
                              onClick={() => setExpiredModal({ isOpen: true, record })}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="处理过期"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {activeTab !== 'expired' && record.reviewStatus !== '已复核' && (
                            <button
                              onClick={() => handleQuickReview(record)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="快速复核"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={expiredModal.isOpen}
        onClose={() => setExpiredModal({ isOpen: false, record: null })}
        title="处理过期里程"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setExpiredModal({ isOpen: false, record: null })}
              className="btn btn-ghost"
            >
              取消
            </button>
            <button
              onClick={handleExpiredSubmit}
              className="btn btn-primary"
            >
              确认处理
            </button>
          </>
        }
      >
        {expiredModal.record && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">会员号</p>
                <p className="font-mono font-medium">{expiredModal.record.memberNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">会员姓名</p>
                <p className="font-medium">{expiredModal.record.memberName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">过期里程</p>
                <p className="font-mono font-semibold text-red-600">
                  {formatMiles(expiredModal.record.remainingMiles)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">对应负债</p>
                <p className="font-semibold text-red-600">
                  {formatCurrency(expiredModal.record.estimatedLiability)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">过期日期</p>
                <p className="font-medium text-red-600">
                  {formatDate(expiredModal.record.expireDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">负债估算依据</p>
                <p className="text-xs text-gray-600 mt-1">
                  负债系数: {((expiredModal.record.estimatedLiability / expiredModal.record.remainingMiles) || 0).toFixed(4)}
                  <br />
                  剩余里程: {formatMiles(expiredModal.record.remainingMiles)}
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
                    <XCircle className={cn('w-5 h-5', expiredAction === '冲回' ? 'text-red-500' : 'text-gray-400')} />
                    <div>
                      <p className={cn('font-medium', expiredAction === '冲回' ? 'text-red-700' : 'text-gray-900')}>
                        冲回负债
                      </p>
                      <p className="text-xs text-gray-500">
                        里程已过期，冲回对应负债
                      </p>
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
                    <RotateCcw className={cn('w-5 h-5', expiredAction === '豁免' ? 'text-emerald-500' : 'text-gray-400')} />
                    <div>
                      <p className={cn('font-medium', expiredAction === '豁免' ? 'text-emerald-700' : 'text-gray-900')}>
                        豁免处理
                      </p>
                      <p className="text-xs text-gray-500">
                        特殊情况，豁免里程过期
                      </p>
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
                placeholder={expiredAction === '冲回'
                  ? '请说明冲回原因，例如：里程已过期，按照规则冲回负债'
                  : '请说明豁免原因，例如：会员特殊申请，批准豁免过期'
                }
                className="input min-h-[100px] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                处理完成后，系统将自动记录追溯链路，包含操作人、操作时间和处理意见
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
