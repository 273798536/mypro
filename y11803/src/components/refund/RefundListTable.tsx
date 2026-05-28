import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Zap, Copy, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { CopyButton } from '@/components/common/CopyButton';
import { formatDateTime, maskPhone } from '@/utils/formatters';
import type { RefundOrder } from '@/types';
import type { FilterState } from './RefundFilter';

interface RefundListTableProps {
  filters: FilterState;
}

type SortField = 'applyTime' | 'amount';
type SortOrder = 'asc' | 'desc';

export function RefundListTable({ filters }: RefundListTableProps) {
  const navigate = useNavigate();
  const refundOrders = useAppStore(state => state.refundOrders);
  const batches = useAppStore(state => state.batches);

  const [sortField, setSortField] = useState<SortField>('applyTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...refundOrders];

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(r =>
        r.id.toLowerCase().includes(keyword) ||
        r.merchantOriginalName.toLowerCase().includes(keyword) ||
        r.originalOrderNo.toLowerCase().includes(keyword) ||
        r.customerName.toLowerCase().includes(keyword)
      );
    }

    if (filters.status) {
      result = result.filter(r => r.status === filters.status);
    }

    if (filters.batchId) {
      result = result.filter(r => r.batchId === filters.batchId);
    }

    if (filters.merchantName) {
      const merchantKeyword = filters.merchantName.toLowerCase();
      result = result.filter(r =>
        r.merchantOriginalName.toLowerCase().includes(merchantKeyword)
      );
    }

    if (filters.hasAnomaly !== null) {
      result = result.filter(r => {
        const hasAnomaly = r.isDuplicate || r.isOverdraft || r.isCrossBatch;
        return filters.hasAnomaly ? hasAnomaly : !hasAnomaly;
      });
    }

    if (filters.dateRange.start) {
      result = result.filter(r => r.applyTime >= filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      result = result.filter(r => r.applyTime <= filters.dateRange.end + 'T23:59:59');
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'applyTime') {
        comparison = new Date(a.applyTime).getTime() - new Date(b.applyTime).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [refundOrders, filters, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getBatchName = (batchId: string) => {
    return batches.find(b => b.id === batchId)?.originalName || batchId;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={14} className="opacity-30" />;
    return sortOrder === 'asc' 
      ? <ChevronUp size={14} className="text-amber-500" />
      : <ChevronDown size={14} className="text-amber-500" />;
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-100 border-b-2 border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
                退款单号
              </th>
              <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
                商户原始名称
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1">
                  退款金额
                  <SortIcon field="amount" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
                批次
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => handleSort('applyTime')}
              >
                <div className="flex items-center gap-1">
                  申请时间
                  <SortIcon field="applyTime" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
                异常标识
              </th>
              <th className="px-4 py-3 text-right text-xs font-mono font-semibold text-slate-600 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-mono">
                  暂无匹配的退款单
                </td>
              </tr>
            ) : (
              filteredAndSortedOrders.map((refund, index) => (
                <RefundRow 
                  key={refund.id} 
                  refund={refund} 
                  batchName={getBatchName(refund.batchId)}
                  isEven={index % 2 === 0}
                  onView={() => navigate(`/refunds/${refund.id}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm font-mono text-slate-600">
        共 {filteredAndSortedOrders.length} 条记录
      </div>
    </div>
  );
}

interface RefundRowProps {
  refund: RefundOrder;
  batchName: string;
  isEven: boolean;
  onView: () => void;
}

function RefundRow({ refund, batchName, isEven, onView }: RefundRowProps) {
  const hasAnomaly = refund.isDuplicate || refund.isOverdraft || refund.isCrossBatch;
  const isBrokenSample = refund.id === 'REFUND-BROKEN-001';

  const rowBgClass = isBrokenSample
    ? 'bg-red-50 hover:bg-red-100'
    : isEven
    ? 'bg-white hover:bg-slate-50'
    : 'bg-slate-50/50 hover:bg-slate-100';

  const anomalyIcons = [];
  if (refund.isOverdraft) anomalyIcons.push(<Zap key="overdraft" size={14} className="text-red-500" title="透支" />);
  if (refund.isDuplicate) anomalyIcons.push(<Copy key="duplicate" size={14} className="text-red-500" title="重复退款" />);
  if (refund.isCrossBatch) anomalyIcons.push(<Lock key="crossbatch" size={14} className="text-orange-500" title="跨批次冻结" />);

  return (
    <tr className={`${rowBgClass} transition-colors ${isBrokenSample ? 'animate-pulse' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-sm font-mono text-slate-800">{refund.id}</code>
          <CopyButton text={refund.id} size="sm" />
        </div>
        <div className="text-xs text-slate-500 font-mono mt-1">
          原始订单: {refund.originalOrderNo}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-800 max-w-[200px] truncate" title={refund.merchantOriginalName}>
          {refund.merchantOriginalName}
        </div>
        <div className="text-xs text-slate-500 font-mono mt-1">
          来源: {refund.sourceSystem}
        </div>
      </td>
      <td className="px-4 py-3">
        <AmountDisplay amount={refund.amount} size="md" />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={refund.status} size="sm" />
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-700 max-w-[180px] truncate" title={batchName}>
          {batchName}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-mono text-slate-700">
          {formatDateTime(refund.applyTime)}
        </div>
        {refund.reviewer && (
          <div className="text-xs text-slate-500 mt-1">
            审核人: {refund.reviewer}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {hasAnomaly ? (
          <div className="flex items-center gap-1">
            {anomalyIcons}
            {isBrokenSample && (
              <span className="px-1.5 py-0.5 text-xs font-mono bg-red-100 text-red-700 rounded">
                样例
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-mono">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onView}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 hover:border-amber-300 transition-all"
        >
          <Eye size={14} />
          详情
        </button>
      </td>
    </tr>
  );
}
