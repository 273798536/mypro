import { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { useStore } from '@/store/useStore';
import {
  Lock as LockIcon,
  Eye,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ListTodo,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import type { DonationRecord, ConflictLog, ProjectBudget, ExpenseReceipt, PurposeLock } from '@/types';

const formatAmount = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'donation':
      return '捐赠记录';
    case 'budget':
      return '项目预算';
    case 'manual':
      return '人工确认';
    default:
      return source;
  }
};

const getConflictTypeLabel = (type: string): string => {
  switch (type) {
    case 'purpose_mismatch':
      return '用途错配';
    case 'receipt_duplicate':
      return '票据重复';
    case 'refund_delayed':
      return '退款晚到';
    default:
      return type;
  }
};

const getConflictDotColor = (type: string): string => {
  switch (type) {
    case 'purpose_mismatch':
      return 'bg-red-500';
    case 'receipt_duplicate':
      return 'bg-amber-500';
    case 'refund_delayed':
      return 'bg-slate-500';
    default:
      return 'bg-slate-500';
  }
};

export default function Lock() {
  const {
    donations,
    budgets,
    receipts,
    locks,
    conflicts,
    lockPurpose,
    detectConflicts,
  } = useStore();

  const [viewMode, setViewMode] = useState<'daily' | 'full'>('daily');
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [lockModalDonation, setLockModalDonation] = useState<DonationRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [lockedPurpose, setLockedPurpose] = useState('');
  const [lockSource, setLockSource] = useState<'donation' | 'budget' | 'manual'>('donation');
  const [lockedBy, setLockedBy] = useState('财务人员');

  const tableRef = useRef<HTMLDivElement>(null);

  const pendingDonations = donations.filter(d => d.status === 'pending' || d.status === 'conflicted');
  const completedDonations = donations.filter(d => d.status === 'locked');

  const sortedConflicts = [...conflicts].sort((a, b) => a.orderIndex - b.orderIndex);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingDonations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingDonations.map(d => d.id)));
    }
  };

  const openLockModal = (donation: DonationRecord) => {
    setLockModalDonation(donation);
    setLockedPurpose(donation.designatedPurpose);
    setLockSource('donation');
    setLockedBy('财务人员');
  };

  const handleLockPurpose = () => {
    if (!lockModalDonation || !lockedPurpose.trim()) return;
    lockPurpose(lockModalDonation.id, lockedPurpose, lockSource, lockedBy);
    detectConflicts();
    setLockModalDonation(null);
  };

  const handleBatchLock = () => {
    selectedIds.forEach(id => {
      const donation = donations.find(d => d.id === id);
      if (donation) {
        lockPurpose(id, donation.designatedPurpose, 'donation', '财务人员');
      }
    });
    detectConflicts();
    setSelectedIds(new Set());
  };

  const scrollToDonation = (donationId: string) => {
    setViewMode('full');
    setSelectedDonation(donations.find(d => d.id === donationId) || null);
    setTimeout(() => {
      const row = document.querySelector(`[data-donation-id="${donationId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const openDetailPanel = (donation: DonationRecord) => {
    setSelectedDonation(donation);
    setDetailModalOpen(true);
  };

  const getDonationBudget = (donation: DonationRecord): ProjectBudget | undefined => {
    return budgets.find(b => b.projectId === donation.projectId);
  };

  const getDonationReceipts = (donationId: string): ExpenseReceipt[] => {
    return receipts.filter(r => r.donationId === donationId);
  };

  const getDonationConflicts = (donationId: string): ConflictLog[] => {
    return conflicts
      .filter(c => c.donationId === donationId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  };

  const getDonationLock = (donationId: string): PurposeLock | undefined => {
    return locks.find(l => l.donationId === donationId);
  };

  const getConflictCount = (donationId: string): number => {
    return conflicts.filter(c => c.donationId === donationId && !c.resolvedAt).length;
  };

  const columns = [
    {
      key: 'select',
      header: '选择',
      width: '50',
      render: (row: DonationRecord) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={() => toggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
        />
      ),
    },
    {
      key: 'id',
      header: '记录ID',
      width: '160',
    },
    {
      key: 'donorName',
      header: '捐赠人',
    },
    {
      key: 'amount',
      header: '金额',
      render: (row: DonationRecord) => formatAmount(row.amount),
    },
    {
      key: 'designatedPurpose',
      header: '指定用途',
    },
    {
      key: 'projectId',
      header: '关联项目',
      render: (row: DonationRecord) => {
        const budget = getDonationBudget(row);
        return budget?.projectName || row.projectId;
      },
    },
    {
      key: 'conflictCount',
      header: '冲突数',
      render: (row: DonationRecord) => {
        const count = getConflictCount(row.id);
        return count > 0 ? (
          <span className="text-red-600 font-medium">{count}</span>
        ) : (
          <span className="text-slate-400">0</span>
        );
      },
    },
    {
      key: 'status',
      header: '状态',
      render: (row: DonationRecord) => <StatusBadge status={row.status} type="donation" />,
    },
    {
      key: 'action',
      header: '操作',
      render: (row: DonationRecord) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDetailPanel(row);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
        >
          <Eye className="w-3 h-3" />
          查看
        </button>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-noto-serif-sc">
            用途锁定
          </h2>
          <p className="text-sm text-slate-500 mt-1">日常处理、冲突留痕、时间线排序</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'daily'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            日常处理视图
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'full'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            完整视图
          </button>
        </div>

        {viewMode === 'daily' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingDonations.map((donation) => {
                const conflictCount = getConflictCount(donation.id);
                return (
                  <div
                    key={donation.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-800">{donation.donorName}</h3>
                        <p className="text-xs text-slate-400 font-mono">{donation.id}</p>
                      </div>
                      {conflictCount > 0 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                          {conflictCount}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">金额</span>
                        <span className="font-semibold text-slate-800">{formatAmount(donation.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">指定用途</span>
                        <span className="text-slate-700">{donation.designatedPurpose}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">状态</span>
                        <StatusBadge status={donation.status} type="donation" />
                      </div>
                    </div>
                    <button
                      onClick={() => openLockModal(donation)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <LockIcon className="w-4 h-4" />
                      锁定用途
                    </button>
                  </div>
                );
              })}
            </div>

            {pendingDonations.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-600">所有捐赠已处理完毕</p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-100">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">
                  已锁定项目 ({completedDonations.length})
                </span>
                {showCompleted ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {showCompleted && (
                <div className="border-t border-slate-100 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedDonations.map((donation) => {
                      const lock = getDonationLock(donation.id);
                      return (
                        <div
                          key={donation.id}
                          className="bg-slate-50 rounded-lg p-4 opacity-75"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-700">{donation.donorName}</h4>
                            <StatusBadge status={donation.status} type="donation" />
                          </div>
                          <p className="text-xs text-slate-500 font-mono mb-2">{donation.id}</p>
                          <p className="text-sm text-slate-700">{formatAmount(donation.amount)}</p>
                          {lock && (
                            <p className="text-xs text-emerald-600 mt-2">
                              锁定用途：{lock.lockedPurpose}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-10 gap-6">
            <div className="col-span-6 space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pendingDonations.length && pendingDonations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-600">
                    已选择 {selectedIds.size} 项
                  </span>
                </div>
                <button
                  onClick={handleBatchLock}
                  disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <LockIcon className="w-4 h-4" />
                  批量锁定
                </button>
              </div>
              <div ref={tableRef} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <DataTable<DonationRecord>
                  columns={columns}
                  data={donations}
                  onRowClick={openDetailPanel}
                  selectedId={selectedDonation?.id}
                />
              </div>
            </div>

            <div className="col-span-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  冲突留痕时间线
                </h3>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-6">
                    {sortedConflicts.map((conflict) => {
                      const donation = donations.find(d => d.id === conflict.donationId);
                      const isResolved = !!conflict.resolvedAt;
                      return (
                        <div key={conflict.id} className="relative pl-10">
                          <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full ${getConflictDotColor(conflict.conflictType)} ring-4 ring-white`} />
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-500">
                                #{conflict.orderIndex} {formatDateTime(conflict.detectedAt)}
                              </span>
                              <StatusBadge status={conflict.severity} type="severity" />
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                                conflict.conflictType === 'purpose_mismatch'
                                  ? 'bg-red-100 text-red-700'
                                  : conflict.conflictType === 'receipt_duplicate'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {getConflictTypeLabel(conflict.conflictType)}
                              </span>
                              <span className="text-sm font-medium text-slate-700">
                                {donation?.donorName}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                              {conflict.description}
                            </p>
                            <div className="flex items-center justify-between">
                              {isResolved ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  已解决
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                  <Clock className="w-3 h-3" />
                                  待处理
                                </span>
                              )}
                              {!isResolved && (
                                <button
                                  onClick={() => scrollToDonation(conflict.donationId)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                                >
                                  处理
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sortedConflicts.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      暂无冲突记录
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {lockModalDonation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">确认锁定用途</h3>
              <button
                onClick={() => setLockModalDonation(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">记录ID</span>
                  <span className="text-slate-700 font-mono">{lockModalDonation.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">捐赠人</span>
                  <span className="text-slate-700">{lockModalDonation.donorName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">金额</span>
                  <span className="text-slate-700 font-semibold">{formatAmount(lockModalDonation.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">指定用途</span>
                  <span className="text-slate-700">{lockModalDonation.designatedPurpose}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">锁定用途</label>
                <input
                  type="text"
                  value={lockedPurpose}
                  onChange={(e) => setLockedPurpose(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="请输入锁定用途"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">用途来源</label>
                <div className="flex gap-4">
                  {(['donation', 'budget', 'manual'] as const).map((source) => (
                    <label key={source} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="source"
                        value={source}
                        checked={lockSource === source}
                        onChange={() => setLockSource(source)}
                        className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700">{getSourceLabel(source)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">操作人</label>
                <input
                  type="text"
                  value={lockedBy}
                  onChange={(e) => setLockedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="请输入操作人"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setLockModalDonation(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleLockPurpose}
                  disabled={!lockedPurpose.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <LockIcon className="w-4 h-4" />
                  确认锁定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailModalOpen && selectedDonation && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => {
              setDetailModalOpen(false);
              setSelectedDonation(null);
            }}
          />
          <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-slate-800">捐赠记录详情</h3>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedDonation(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  基本信息
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">记录ID</span>
                    <span className="text-sm text-slate-700 font-mono">{selectedDonation.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">捐赠人</span>
                    <span className="text-sm text-slate-700">{selectedDonation.donorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">金额</span>
                    <span className="text-sm text-slate-700 font-semibold">
                      {formatAmount(selectedDonation.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">指定用途</span>
                    <span className="text-sm text-slate-700">{selectedDonation.designatedPurpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">捐赠日期</span>
                    <span className="text-sm text-slate-700">{selectedDonation.donationDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">项目ID</span>
                    <span className="text-sm text-slate-700 font-mono">{selectedDonation.projectId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">状态</span>
                    <StatusBadge status={selectedDonation.status} type="donation" />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  关联项目预算
                </h4>
                {getDonationBudget(selectedDonation) ? (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">项目名称</span>
                      <span className="text-sm text-slate-700">{getDonationBudget(selectedDonation)?.projectName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">预算金额</span>
                      <span className="text-sm text-slate-700">{formatAmount(getDonationBudget(selectedDonation)?.budgetAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">预算用途</span>
                      <span className="text-sm text-slate-700">{getDonationBudget(selectedDonation)?.purpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">预算状态</span>
                      <StatusBadge status={getDonationBudget(selectedDonation)?.status || ''} type="budget" />
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                    未关联预算
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  关联支出票据
                </h4>
                {getDonationReceipts(selectedDonation.id).length > 0 ? (
                  <div className="space-y-2">
                    {getDonationReceipts(selectedDonation.id).map((receipt: ExpenseReceipt) => (
                      <div key={receipt.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{receipt.id}</span>
                          <StatusBadge status={receipt.status} type="receipt" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <span>{formatAmount(receipt.amount)}</span>
                          <span>{receipt.receiptDate}</span>
                        </div>
                        {receipt.ocrText && (
                          <p className="text-xs text-slate-400 line-clamp-2">{receipt.ocrText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                    暂无关联票据
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  冲突记录
                </h4>
                {getDonationConflicts(selectedDonation.id).length > 0 ? (
                  <div className="space-y-2">
                    {getDonationConflicts(selectedDonation.id).map((conflict: ConflictLog) => (
                      <div key={conflict.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            {getConflictTypeLabel(conflict.conflictType)}
                          </span>
                          <StatusBadge status={conflict.severity} type="severity" />
                          {conflict.resolvedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              已解决
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <Clock className="w-3 h-3" />
                              待处理
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{conflict.description}</p>
                        {conflict.resolution && (
                          <p className="text-xs text-emerald-600 mt-2">
                            解决方案：{conflict.resolution}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                    暂无冲突记录
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <LockIcon className="w-4 h-4 text-slate-600" />
                  用途锁定
                </h4>
                {getDonationLock(selectedDonation.id) ? (
                  <div className="bg-emerald-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">用途已锁定</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">锁定用途</span>
                      <span className="text-sm text-emerald-800 font-medium">{getDonationLock(selectedDonation.id)?.lockedPurpose}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">锁定来源</span>
                      <span className="text-sm text-emerald-800">{getSourceLabel(getDonationLock(selectedDonation.id)?.source || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">锁定时间</span>
                      <span className="text-sm text-emerald-800">{formatDateTime(getDonationLock(selectedDonation.id)?.lockedAt || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-emerald-600">操作人</span>
                      <span className="text-sm text-emerald-800">{getDonationLock(selectedDonation.id)?.lockedBy}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openLockModal(selectedDonation);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <LockIcon className="w-4 h-4" />
                    锁定用途
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
