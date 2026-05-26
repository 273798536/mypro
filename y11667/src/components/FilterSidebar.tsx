import { useMemo } from 'react';
import { X, Filter, Warehouse, Package, CheckCircle, Calendar } from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { WAREHOUSES, DATA_SOURCES } from '@/data/warehouseConfig';
import { QualityStatus } from '@/types';

export function FilterSidebar() {
  const { filters, setFilters, resetFilters, receipts } = useWarehouseStore();

  const batchNumbers = useMemo(() => {
    const set = new Set(receipts.map((r) => r.batchNumber));
    return Array.from(set).sort();
  }, [receipts]);

  const toggleWarehouse = (whId: string) => {
    const current = filters.warehouses;
    const next = current.includes(whId)
      ? current.filter((id) => id !== whId)
      : [...current, whId];
    setFilters({ warehouses: next });
  };

  const toggleQualityStatus = (status: QualityStatus) => {
    const current = filters.qualityStatus;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilters({ qualityStatus: next });
  };

  const toggleBatchNumber = (batch: string) => {
    const current = filters.batchNumbers;
    const next = current.includes(batch)
      ? current.filter((b) => b !== batch)
      : [...current, batch];
    setFilters({ batchNumbers: next });
  };

  const hasActiveFilters =
    filters.warehouses.length > 0 ||
    filters.qualityStatus.length > 0 ||
    filters.batchNumbers.length > 0 ||
    filters.deliveryDateRange !== null;

  return (
    <div className="w-72 bg-slate-900/90 backdrop-blur-md border-r border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <h2 className="text-white font-semibold">筛选条件</h2>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Warehouse className="w-4 h-4 text-slate-400" />
            <label className="text-sm text-slate-300 font-medium">仓库</label>
          </div>
          <div className="space-y-2">
            {WAREHOUSES.map((wh) => (
              <button
                key={wh.id}
                onClick={() => toggleWarehouse(wh.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  filters.warehouses.includes(wh.id)
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-slate-800/50 text-slate-300 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                {wh.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-slate-400" />
            <label className="text-sm text-slate-300 font-medium">质检状态</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'pass' as QualityStatus, label: '合格', color: 'emerald' },
              { value: 'fail' as QualityStatus, label: '不合格', color: 'red' },
              { value: 'pending' as QualityStatus, label: '待检', color: 'yellow' },
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => toggleQualityStatus(status.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  filters.qualityStatus.includes(status.value)
                    ? status.color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : status.color === 'red'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-slate-400" />
            <label className="text-sm text-slate-300 font-medium">批次号</label>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {batchNumbers.slice(0, 15).map((batch) => (
              <button
                key={batch}
                onClick={() => toggleBatchNumber(batch)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                  filters.batchNumbers.includes(batch)
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {batch}
              </button>
            ))}
            {batchNumbers.length > 15 && (
              <p className="text-xs text-slate-600 px-2">
                还有 {batchNumbers.length - 15} 个批次...
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-sm text-slate-300 font-medium">交割日期</label>
          </div>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.deliveryDateRange?.start || ''}
              onChange={(e) =>
                setFilters({
                  deliveryDateRange: {
                    start: e.target.value,
                    end: filters.deliveryDateRange?.end || e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={filters.deliveryDateRange?.end || ''}
              onChange={(e) =>
                setFilters({
                  deliveryDateRange: {
                    start: filters.deliveryDateRange?.start || e.target.value,
                    end: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <h4 className="text-xs text-slate-500 font-semibold mb-2">数据来源</h4>
        <div className="space-y-1 text-[10px] text-slate-600">
          <p>{DATA_SOURCES.warehouse}</p>
          <p>{DATA_SOURCES.receipt}</p>
          <p>{DATA_SOURCES.quality}</p>
        </div>
      </div>
    </div>
  );
}
