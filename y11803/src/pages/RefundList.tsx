import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { BrokenSampleAlert } from '@/components/refund/BrokenSampleAlert';
import { RefundFilter, FilterState } from '@/components/refund/RefundFilter';
import { RefundListTable } from '@/components/refund/RefundListTable';
import { ExportButton } from '@/components/common/ExportButton';
import { useAppStore } from '@/store/useAppStore';
import { getRefundExportMapping, formatRefundForExport } from '@/utils/exportUtils';
import { useMemo } from 'react';

export default function RefundList() {
  const refundOrders = useAppStore(state => state.refundOrders);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    status: '',
    batchId: '',
    merchantName: '',
    hasAnomaly: null,
    dateRange: { start: '', end: '' },
  });

  const filteredOrders = useMemo(() => {
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

    return result;
  }, [refundOrders, filters]);

  const brokenRefund = refundOrders.find(r => r.id === 'REFUND-BROKEN-001');

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-mono text-slate-800">
          退款单列表
        </h2>
        <ExportButton
          data={formatRefundForExport(filteredOrders)}
          filename="退款单列表"
          fieldMapping={getRefundExportMapping()}
          label="导出当前列表"
        />
      </div>

      {brokenRefund && <BrokenSampleAlert />}

      <RefundFilter onFilterChange={setFilters} />

      <RefundListTable filters={filters} />
    </PageContainer>
  );
}
