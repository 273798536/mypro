import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Container } from '@/types';

const statusBadgeMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '已确认', cls: 'bg-emerald-100 text-emerald-700' },
  exported: { label: '已导出', cls: 'bg-sky-100 text-sky-700' },
};

const waiverStatusBadgeMap: Record<string, { label: string; cls: string }> = {
  none: { label: '无减免', cls: 'bg-gray-100 text-gray-500' },
  applied: { label: '已申请', cls: 'bg-violet-100 text-violet-700' },
  approved: { label: '已批准', cls: 'bg-sky-100 text-sky-700' },
  rejected: { label: '已拒绝', cls: 'bg-rose-100 text-rose-700' },
  expired: { label: '已过期', cls: 'bg-rose-100 text-rose-600' },
};

const inspectionBadgeMap: Record<string, { label: string; cls: string }> = {
  none: { label: '无', cls: 'bg-gray-100 text-gray-500' },
  pending: { label: '待查验', cls: 'bg-amber-100 text-amber-700' },
  in_progress: { label: '查验中', cls: 'bg-sky-100 text-sky-700' },
  completed: { label: '已完成', cls: 'bg-emerald-100 text-emerald-700' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function formatFee(val: number) {
  return `¥${val.toLocaleString()}`;
}

function findDuplicateContainerNos(containers: Container[]) {
  const countMap: Record<string, number> = {};
  containers.forEach((c) => {
    countMap[c.containerNo] = (countMap[c.containerNo] || 0) + 1;
  });
  return new Set(Object.entries(countMap).filter(([, v]) => v > 1).map(([k]) => k));
}

export default function Dashboard() {
  const {
    containers,
    filters,
    updateFilters,
    resetFilters,
    getFilteredContainers,
    selectedContainerIds,
    toggleSelectContainer,
    selectAllContainers,
    clearSelection,
    confirmContainer,
    batchConfirm,
    openDrawer,
  } = useStore();

  const filtered = getFilteredContainers();
  const duplicateNos = findDuplicateContainerNos(containers);

  const pendingCount = containers.filter((c) => c.status === 'pending').length;
  const confirmedCount = containers.filter((c) => c.status === 'confirmed').length;
  const approvedWaiverCount = containers.filter((c) => c.waiverStatus === 'approved').length;
  const expiredWaiverCount = containers.filter((c) => c.waiverStatus === 'expired').length;

  const statCards = [
    {
      label: '待处理',
      count: pendingCount,
      icon: Clock,
      gradient: 'from-amber-400 to-amber-600',
      shadow: 'shadow-amber-200',
    },
    {
      label: '已确认',
      count: confirmedCount,
      icon: CheckCircle,
      gradient: 'from-emerald-400 to-emerald-600',
      shadow: 'shadow-emerald-200',
    },
    {
      label: '减免通过',
      count: approvedWaiverCount,
      icon: ClipboardCheck,
      gradient: 'from-sky-400 to-sky-600',
      shadow: 'shadow-sky-200',
    },
    {
      label: '减免过期',
      count: expiredWaiverCount,
      icon: AlertTriangle,
      gradient: 'from-rose-400 to-rose-600',
      shadow: 'shadow-rose-200',
    },
  ];

  const handleConfirm = (id: string) => {
    if (window.confirm('确认该条减免核算结果？')) {
      confirmContainer(id);
    }
  };

  const handleBatchConfirm = () => {
    if (window.confirm(`确认批量核算选中的 ${selectedContainerIds.length} 条记录？`)) {
      batchConfirm();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1.5 h-8 rounded-full bg-port-500" />
        <h1 className="text-2xl font-bold text-port-700 tracking-wide">港口堆存费减免核算工作台</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} ${card.shadow} shadow-lg p-5 text-white animate-slide-up`}
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold mt-1 font-mono">{card.count}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-port-500" />
          <span className="text-sm font-semibold text-port-700">筛选条件</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索箱号..."
              value={filters.containerNo || ''}
              onChange={(e) => updateFilters({ containerNo: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-port-300 focus:border-port-400 transition"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => updateFilters({ status: e.target.value || undefined })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-port-300 bg-white min-w-[120px]"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="confirmed">已确认</option>
            <option value="exported">已导出</option>
          </select>
          <select
            value={filters.waiverStatus || ''}
            onChange={(e) => updateFilters({ waiverStatus: e.target.value || undefined })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-port-300 bg-white min-w-[120px]"
          >
            <option value="">全部减免</option>
            <option value="none">无减免</option>
            <option value="applied">已申请</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
            <option value="expired">已过期</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => updateFilters({ dateFrom: e.target.value || undefined })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-port-300"
          />
          <span className="text-slate-400 text-sm">至</span>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => updateFilters({ dateTo: e.target.value || undefined })}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-port-300"
          />
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>

      {selectedContainerIds.length > 0 && (
        <div className="bg-port-500/5 border border-port-500/20 rounded-xl px-5 py-3 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAllContainers}
              className="flex items-center gap-2 text-sm text-port-600 hover:text-port-800 transition"
            >
              <CheckSquare className="w-4 h-4" />
              全选
            </button>
            <span className="text-sm font-semibold text-port-700">
              已选 <span className="text-port-500 font-mono">{selectedContainerIds.length}</span> 条
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchConfirm}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              批量确认
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition"
            >
              <XCircle className="w-4 h-4" />
              清除选择
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-port-500 to-port-600 text-white">
                <th className="px-4 py-3 text-left font-semibold w-10"></th>
                <th className="px-4 py-3 text-left font-semibold">箱号</th>
                <th className="px-4 py-3 text-left font-semibold">箱型</th>
                <th className="px-4 py-3 text-left font-semibold">进港时间</th>
                <th className="px-4 py-3 text-left font-semibold">出港时间</th>
                <th className="px-4 py-3 text-center font-semibold">堆存天数</th>
                <th className="px-4 py-3 text-center font-semibold">查验状态</th>
                <th className="px-4 py-3 text-center font-semibold">减免状态</th>
                <th className="px-4 py-3 text-right font-semibold">原费</th>
                <th className="px-4 py-3 text-right font-semibold">减免</th>
                <th className="px-4 py-3 text-right font-semibold">实付</th>
                <th className="px-4 py-3 text-center font-semibold">状态</th>
                <th className="px-4 py-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => {
                const isDuplicate = duplicateNos.has(c.containerNo);
                const isSelected = selectedContainerIds.includes(c.id);
                const isEven = idx % 2 === 0;
                const waiverBadge = waiverStatusBadgeMap[c.waiverStatus] || { label: c.waiverStatus, cls: 'bg-gray-100 text-gray-500' };
                const statusBadge = statusBadgeMap[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-500' };
                const inspBadge = inspectionBadgeMap[c.inspectionStatus] || { label: c.inspectionStatus, cls: 'bg-gray-100 text-gray-500' };

                return (
                  <tr
                    key={c.id}
                    className={`
                      border-b border-slate-100 transition-colors
                      ${isEven ? 'bg-white' : 'bg-slate-50/50'}
                      ${isSelected ? 'bg-port-50/60' : 'hover:bg-blue-50/50'}
                      ${isDuplicate ? 'border-l-4 border-l-orange-400' : ''}
                    `}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectContainer(c.id)}
                        className="w-4 h-4 rounded border-slate-300 text-port-500 focus:ring-port-400 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/container/${c.id}`}
                          className="font-mono font-semibold text-port-600 hover:text-port-800 hover:underline transition"
                        >
                          {c.containerNo}
                        </Link>
                        {isDuplicate && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-600 rounded">
                            重复
                          </span>
                        )}
                        {c.affectedByRuleChange && (
                          <span className="relative flex h-2.5 w-2.5" title={c.affectedByRuleChange}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.containerType}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(c.arrivalDate)}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{formatDate(c.departureDate)}</td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-slate-700">{c.storageDays}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inspBadge.cls}`}>
                        {inspBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${waiverBadge.cls}`}>
                        {waiverBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{formatFee(c.originalFee)}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {c.waivedFee > 0 ? (
                        <span className="text-emerald-600 font-semibold">{formatFee(c.waivedFee)}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{formatFee(c.finalFee)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {c.status === 'pending' && (
                          <button
                            onClick={() => handleConfirm(c.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            确认
                          </button>
                        )}
                        <Link
                          to={`/container/${c.id}`}
                          className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-port-500 hover:text-port-700 transition"
                        >
                          详情
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-400">
                    <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">暂无匹配的数据</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>共 <span className="font-mono font-semibold text-port-600">{filtered.length}</span> 条记录</span>
          <span>已选 <span className="font-mono font-semibold text-port-600">{selectedContainerIds.length}</span> 条</span>
        </div>
      </div>
    </div>
  );
}
