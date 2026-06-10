import { useState } from 'react';
import { Info, ScrollText } from 'lucide-react';
import TimelineList from '@/components/audit/TimelineList';
import { useAuditStore } from '@/store/useAuditStore';

export default function AuditLogPage() {
  const getFilteredLogs = useAuditStore(s => s.getFilteredLogs);
  const setFilterOperator = useAuditStore(s => s.setFilterOperator);
  const setFilterBatchId = useAuditStore(s => s.setFilterBatchId);
  const setFilterDateRange = useAuditStore(s => s.setFilterDateRange);
  const logs = getFilteredLogs();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilterChange = (filters: { operator?: string; entityId?: string; dateFrom?: string; dateTo?: string }) => {
    if (filters.operator !== undefined) setFilterOperator(filters.operator);
    if (filters.entityId !== undefined) setFilterBatchId(filters.entityId);
    if (filters.dateFrom !== undefined && filters.dateTo !== undefined) {
      setFilterDateRange(filters.dateFrom && filters.dateTo ? [filters.dateFrom, filters.dateTo] : null);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <ScrollText className="w-5 h-5 text-teal-700" />
          <h1 className="text-xl font-semibold text-slate-800">审计日志</h1>
        </div>
        <p className="text-sm text-slate-500">所有复核操作的完整记录，包含操作人、时间和变更详情</p>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">审计日志不可删除，仅可追加记录</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <TimelineList
          logs={logs}
          onFilterChange={handleFilterChange}
          expandedId={expandedId}
          onToggleExpand={setExpandedId}
        />
      </div>
    </div>
  );
}
