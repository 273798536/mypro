import { useEffect } from 'react';
import { useRebateStore, stores, salesPersons } from '../store/rebateStore';
import { TrendingUp, CheckCircle, AlertTriangle, XCircle, FileCheck } from 'lucide-react';

export default function Overview() {
  const { initializeData, getStatistics, setFilters, filters, getFilteredResults, rebateResults } = useRebateStore();
  const stats = getStatistics();
  const filteredResults = getFilteredResults();

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const statCards = [
    {
      label: '总返利金额',
      value: `¥${stats.totalRebate.toFixed(2)}`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: '正常记录',
      value: stats.normalCount,
      icon: CheckCircle,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: '警告记录',
      value: stats.warningCount,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      pulse: stats.warningCount > 0,
    },
    {
      label: '争议记录',
      value: stats.disputedCount,
      icon: XCircle,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      pulse: stats.disputedCount > 0,
    },
    {
      label: '已确认',
      value: stats.confirmedCount,
      icon: FileCheck,
      color: 'from-slate-600 to-slate-700',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">返利概览</h1>
          <p className="text-slate-500 mt-1">查看返利统计和快速筛选</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">快速筛选</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">门店</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={filters.storeId || ''}
              onChange={(e) => setFilters({ ...filters, storeId: e.target.value || undefined })}
            >
              <option value="">全部门店</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">销售</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={filters.salesId || ''}
              onChange={(e) => setFilters({ ...filters, salesId: e.target.value || undefined })}
            >
              <option value="">全部销售</option>
              {salesPersons.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">状态</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: (e.target.value as any) || undefined })}
            >
              <option value="">全部状态</option>
              <option value="normal">正常</option>
              <option value="warning">警告</option>
              <option value="disputed">争议</option>
              <option value="confirmed">已确认</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">起始日期</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-10 h-10 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.textColor} ${card.pulse ? 'animate-pulse-dot' : ''}`} />
                </div>
              </div>
              <div className={`h-1 w-full bg-gradient-to-r ${card.color} rounded-full mt-4 opacity-80`} />
            </div>
          );
        })}
      </div>

      {(stats.disputedCount > 0 || stats.warningCount > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">存在需要处理的异常记录</h3>
              <p className="text-sm text-amber-700 mt-1">
                检测到 {stats.warningCount} 条警告记录和 {stats.disputedCount} 条争议记录，请前往争议清单页面处理。
                这些记录可能涉及销售归属变更、跨月退课或私教包拆分，需要人工确认。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">筛选结果预览</h2>
          <p className="text-sm text-slate-500 mt-0.5">共 {filteredResults.length} 条记录</p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {filteredResults.slice(0, 5).map((result) => {
              const contract = rebateResults.find((r) => r.id === result.id)?.contractId;
              return (
                <div
                  key={result.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    result.status === 'disputed'
                      ? 'bg-rose-50 border-rose-200'
                      : result.status === 'warning'
                      ? 'bg-amber-50 border-amber-200'
                      : result.status === 'confirmed'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        result.status === 'normal'
                          ? 'bg-blue-500'
                          : result.status === 'warning'
                          ? 'bg-amber-500 animate-pulse-dot'
                          : result.status === 'disputed'
                          ? 'bg-rose-500 animate-pulse-dot'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-slate-800">{result.salesName}</p>
                      <p className="text-xs text-slate-500">{result.storeName} · {result.contractId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">¥{result.finalAmount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">
                      {result.warnings.length > 0 ? `${result.warnings.length} 个异常` : '无异常'}
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredResults.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                暂无筛选结果
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
