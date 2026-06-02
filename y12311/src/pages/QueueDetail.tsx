import React, { useEffect, useMemo, useState } from 'react';
import { Download, ListFilter, History } from 'lucide-react';
import FilterPanel from '../components/features/FilterPanel';
import QueueTable from '../components/features/QueueTable';
import { useQueueStore } from '../store/useQueueStore';
import { useFilterStore } from '../engines/FilterSyncEngine';
import { useSupplementStore, supplementEngine } from '../engines/SupplementEngine';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const QueueDetail: React.FC = () => {
  const { loadData, getFilteredData, isLoading, setHighlightedSupplementId } = useQueueStore();
  const { dateRange, keyword } = useFilterStore();
  const { supplements } = useSupplementStore();
  const [showSupplementHistory, setShowSupplementHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => getFilteredData(), [getFilteredData]);

  const recentSupplements = useMemo(() => {
    return [...supplements]
      .sort((a, b) => b.supplementTime.getTime() - a.supplementTime.getTime())
      .slice(0, 5);
  }, [supplements]);

  const handleHighlightSupplement = (supplementId: string | null) => {
    setHighlightedSupplementId(supplementId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 font-serif">排队明细</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {format(dateRange[0], 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
            {format(dateRange[1], 'yyyy年MM月dd日', { locale: zhCN })} 共 {filteredData.records.length} 条记录
            {keyword && <span className="ml-2">搜索："{keyword}"</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSupplementHistory(!showSupplementHistory)}
            className={`btn-secondary flex items-center gap-2 ${showSupplementHistory ? 'bg-primary-50 border-primary-300 text-primary-600' : ''}`}
          >
            <History size={16} />
            补录记录 ({recentSupplements.length})
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            导出
          </button>
        </div>
      </div>

      {showSupplementHistory && recentSupplements.length > 0 && (
        <div className="card bg-warning-50/50 border-warning-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
              <History size={18} className="text-warning-500" />
              最近补录记录
            </h3>
            <button
              onClick={() => setShowSupplementHistory(false)}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              收起
            </button>
          </div>
          <div className="space-y-2">
            {recentSupplements.map((supp) => (
              <div
                key={supp.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-warning-100 hover:border-warning-300 transition-colors cursor-pointer"
                onMouseEnter={() => handleHighlightSupplement(supp.id)}
                onMouseLeave={() => handleHighlightSupplement(null)}
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium text-warning-700">
                      {supplementEngine.getSupplementFieldLabel(supp.fieldName)}
                    </span>
                    <span className="mx-2 text-neutral-400">→</span>
                    <span className="text-danger-500 line-through">{supp.oldValue || '(空)'}</span>
                    <span className="mx-2 text-neutral-400">→</span>
                    <span className="text-success-600 font-medium">{supp.newValue}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>操作人：{supp.operator}</span>
                  <span>{format(supp.supplementTime, 'MM-dd HH:mm', { locale: zhCN })}</span>
                  <span className="badge-warning">影响 {supp.affectedRecords.length} 条</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            💡 鼠标悬停可高亮查看受影响的明细记录
          </p>
        </div>
      )}

      <FilterPanel />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <ListFilter size={16} />
          <span>
            显示 {filteredData.records.length} 条记录
            {filteredData.records.some((r) => r.hasException) && (
              <span className="ml-2 text-danger-500">
                含 {filteredData.records.filter((r) => r.hasException).length} 条异常
              </span>
            )}
            {filteredData.records.some((r) => r.isSupplemented) && (
              <span className="ml-2 text-warning-500">
                含 {filteredData.records.filter((r) => r.isSupplemented).length} 条补录
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger-400" />
            已确认异常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-400" />
            待确认异常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-500 animate-breathe" />
            存在补录
          </span>
        </div>
      </div>

      <QueueTable
        records={filteredData.records}
        visitors={filteredData.visitors}
        appointments={filteredData.appointments}
        windows={filteredData.windows}
      />
    </div>
  );
};

export default QueueDetail;
