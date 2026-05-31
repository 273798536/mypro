import { useState, useEffect } from 'react';
import {
  Search, FilePlus, Eye, ClipboardCheck, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBillStore } from '@/stores/billStore';
import StatusBadge from '@/components/StatusBadge';
import BillDetailPanel from '@/components/BillDetail';
import GenerateBillDialog from '@/components/GenerateBillDialog';
import type { Bill, BillStatus, UserType, UserCategory } from '../../shared/types';
import {
  USER_TYPE_LABELS, USER_CATEGORY_LABELS, BILL_STATUS_LABELS,
} from '../../shared/types';

interface BillRow extends Bill {
  user_name?: string;
}

const USER_TYPE_OPTIONS: { value: UserType; label: string }[] = [
  { value: 'resident', label: '居民' },
  { value: 'commercial', label: '商业' },
  { value: 'industrial', label: '工业' },
  { value: 'temporary', label: '临时' },
];

const USER_CATEGORY_OPTIONS: { value: UserCategory; label: string }[] = [
  { value: 'single', label: '单户' },
  { value: 'combined', label: '合表' },
];

const STATUS_OPTIONS: { value: BillStatus; label: string }[] = [
  { value: 'pending', label: '待复核' },
  { value: 'reviewing', label: '复核中' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已驳回' },
  { value: 'exception', label: '异常' },
];

export default function BillReview() {
  const {
    bills, loading, pagination, fetchBills, fetchBillById,
  } = useBillStore();

  const [filterMonth, setFilterMonth] = useState('');
  const [filterUserType, setFilterUserType] = useState('');
  const [filterUserCategory, setFilterUserCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleSearch = () => {
    fetchBills({
      billing_month: filterMonth || undefined,
      user_type: filterUserType || undefined,
      status: (filterStatus || undefined) as BillStatus | undefined,
    });
  };

  const handlePageChange = (page: number) => {
    useBillStore.setState({ pagination: { ...pagination, page } });
    handleSearch();
  };

  const handleView = async (id: string) => {
    setSelectedBillId(id);
    setReviewMode(false);
    setDetailOpen(true);
    await fetchBillById(id);
  };

  const handleReview = async (id: string) => {
    setSelectedBillId(id);
    setReviewMode(true);
    setDetailOpen(true);
    await fetchBillById(id);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedBillId(null);
  };

  const totalPages = Math.ceil(pagination.total / pagination.page_size);
  const billRows = bills as BillRow[];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">账单月份</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">用户类型</label>
          <select
            value={filterUserType}
            onChange={(e) => setFilterUserType(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          >
            <option value="">全部</option>
            {USER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">用水类别</label>
          <select
            value={filterUserCategory}
            onChange={(e) => setFilterUserCategory(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          >
            <option value="">全部</option>
            {USER_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">状态</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          >
            <option value="">全部</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSearch}
          className="flex items-center gap-1.5 rounded-md bg-[#3b82f6] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2563eb]"
        >
          <Search className="h-4 w-4" /> 查询
        </button>
        <div className="ml-auto">
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#1e3a5f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2a4d7a]"
          >
            <FilePlus className="h-4 w-4" /> 生成账单
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#1e3a5f] text-white">
                    <th className="px-4 py-3 text-left font-medium">户号</th>
                    <th className="px-4 py-3 text-left font-medium">户名</th>
                    <th className="px-4 py-3 text-left font-medium">用户类型</th>
                    <th className="px-4 py-3 text-left font-medium">用水类别</th>
                    <th className="px-4 py-3 text-left font-medium">账单月份</th>
                    <th className="px-4 py-3 text-right font-medium">用水量(t)</th>
                    <th className="px-4 py-3 text-right font-medium">应缴金额(¥)</th>
                    <th className="px-4 py-3 text-center font-medium">状态</th>
                    <th className="px-4 py-3 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {billRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        暂无账单数据
                      </td>
                    </tr>
                  ) : (
                    billRows.map((bill, idx) => (
                      <tr
                        key={bill.id}
                        className={cn(
                          'border-b transition-colors hover:bg-gray-50',
                          idx % 2 === 1 && 'bg-gray-50/50',
                          bill.status === 'exception' && 'bg-red-50 hover:bg-red-100'
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-gray-700">{bill.user_no}</td>
                        <td className="px-4 py-3 text-gray-900">{bill.user_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded bg-[#1e3a5f]/10 px-2 py-0.5 text-xs font-medium text-[#1e3a5f]">
                            {USER_TYPE_LABELS[bill.user_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded bg-[#3b82f6]/10 px-2 py-0.5 text-xs font-medium text-[#3b82f6]">
                            {USER_CATEGORY_LABELS[bill.user_category]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{bill.billing_month}</td>
                        <td className="px-4 py-3 text-right font-mono">{bill.total_usage.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[#1e3a5f]">
                          ¥{bill.calculated_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={bill.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(bill.id)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#3b82f6] hover:bg-[#3b82f6]/10"
                            >
                              <Eye className="h-3.5 w-3.5" /> 查看
                            </button>
                            <button
                              onClick={() => handleReview(bill.id)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" /> 复核
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {pagination.total > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-gray-500">
                  共 {pagination.total} 条记录，第 {pagination.page}/{totalPages} 页
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={cn(
                          'rounded px-3 py-1 text-sm font-medium',
                          p === pagination.page
                            ? 'bg-[#3b82f6] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= totalPages}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BillDetailPanel
        open={detailOpen}
        onClose={handleCloseDetail}
        reviewMode={reviewMode}
      />
      <GenerateBillDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
