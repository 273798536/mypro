import { useLedgerStore } from '../store/useLedgerStore';
import { Search, Calendar, Building2, Tag, X, Filter } from 'lucide-react';

export default function TransactionFilters() {
  const { filters, setFilters, clearFilters, campaigns, transactions } = useLedgerStore();

  const merchants = Array.from(new Map(transactions.map(tx => [tx.merchantId, tx.merchantName])).entries());
  
  const hasActiveFilters = 
    filters.dateRange !== null ||
    filters.merchantIds.length > 0 ||
    filters.campaignIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.anomalyTypes.length > 0 ||
    filters.searchTerm.trim() !== '';

  const toggleArrayFilter = (
    field: 'merchantIds' | 'campaignIds' | 'statuses' | 'anomalyTypes',
    value: string
  ) => {
    const current = filters[field] as string[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ [field]: next });
  };

  return (
    <div className="cli-card mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-navy-200">
          <Filter className="w-4 h-4" />
          <span>筛选条件</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-200 transition-colors"
          >
            <X className="w-3 h-3" />
            清除筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-navy-400 mb-1">搜索</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ searchTerm: e.target.value })}
              placeholder="交易ID/商户/卡号"
              className="cli-input w-full pl-8"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-navy-400 mb-1">
            <Calendar className="inline w-3 h-3 mr-1" />
            日期范围
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.dateRange?.start || ''}
              onChange={(e) =>
                setFilters({
                  dateRange: {
                    start: e.target.value,
                    end: filters.dateRange?.end || e.target.value,
                  },
                })
              }
              className="cli-input flex-1 text-xs"
            />
            <input
              type="date"
              value={filters.dateRange?.end || ''}
              onChange={(e) =>
                setFilters({
                  dateRange: {
                    start: filters.dateRange?.start || e.target.value,
                    end: e.target.value,
                  },
                })
              }
              className="cli-input flex-1 text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-navy-400 mb-1">
            <Building2 className="inline w-3 h-3 mr-1" />
            商户
          </label>
          <select
            multiple
            value={filters.merchantIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, opt => opt.value);
              setFilters({ merchantIds: values });
            }}
            className="cli-input w-full h-20 text-xs"
          >
            {merchants.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-navy-400 mb-1">
            <Tag className="inline w-3 h-3 mr-1" />
            活动
          </label>
          <select
            multiple
            value={filters.campaignIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, opt => opt.value);
              setFilters({ campaignIds: values });
            }}
            className="cli-input w-full h-20 text-xs"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.version})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-navy-800">
        <div>
          <label className="block text-xs text-navy-400 mb-1">交易状态</label>
          <div className="flex flex-wrap gap-1">
            {(['normal', 'anomaly', 'revised', 'pending_review'] as const).map(s => (
              <button
                key={s}
                onClick={() => toggleArrayFilter('statuses', s)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.statuses.includes(s)
                    ? 'bg-navy-600 border-navy-500 text-white'
                    : 'bg-navy-900 border-navy-700 text-navy-400 hover:border-navy-500'
                }`}
              >
                {s === 'normal' ? '正常' : s === 'anomaly' ? '异常' : s === 'revised' ? '已修正' : '待确认'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-navy-400 mb-1">异常类型</label>
          <div className="flex flex-wrap gap-1">
            {(['refund_not_rolledback', 'subsidy_cross_campaign', 'points_rate_overlap', 'manual_review_needed'] as const).map(a => (
              <button
                key={a}
                onClick={() => toggleArrayFilter('anomalyTypes', a)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  filters.anomalyTypes.includes(a)
                    ? 'bg-red-900/50 border-red-600 text-red-300'
                    : 'bg-navy-900 border-navy-700 text-navy-400 hover:border-navy-500'
                }`}
              >
                {a === 'refund_not_rolledback' ? '退款未回滚' :
                 a === 'subsidy_cross_campaign' ? '补贴跨活动' :
                 a === 'points_rate_overlap' ? '积分倍率叠加' : '需人工确认'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
