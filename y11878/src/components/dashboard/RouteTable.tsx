import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Search, GitBranch } from 'lucide-react';
import { useNetworkStore } from '@/store/useNetworkStore';
import type { Route } from '@/types';

type SortField = 'id' | 'utilization' | 'capacity' | 'flow';
type SortOrder = 'asc' | 'desc';

export default function RouteTable() {
  const navigate = useNavigate();
  const { routes, analysisResult, setSelectedRouteId } = useNetworkStore();
  const [sortField, setSortField] = useState<SortField>('utilization');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filter, setFilter] = useState('');
  const [showBottleneckOnly, setShowBottleneckOnly] = useState(false);

  const filteredAndSortedRoutes = useMemo(() => {
    let result = [...routes];

    if (showBottleneckOnly) {
      result = result.filter((r) => r.isBottleneck);
    }

    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(lowerFilter) ||
          r.from.toLowerCase().includes(lowerFilter) ||
          r.to.toLowerCase().includes(lowerFilter)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'utilization':
          comparison = a.utilization - b.utilization;
          break;
        case 'capacity':
          comparison = a.capacity - b.capacity;
          break;
        case 'flow':
          comparison = a.flow - b.flow;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [routes, sortField, sortOrder, filter, showBottleneckOnly]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = (route: Route) => {
    setSelectedRouteId(route.id);
    navigate(`/trace?routeId=${route.id}`);
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 0.9) return 'bg-accent-red';
    if (util >= 0.7) return 'bg-accent-amber';
    if (util >= 0.4) return 'bg-accent-orange';
    return 'bg-accent-cyan';
  };

  const SortHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <th
      className="table-header cursor-pointer hover:text-white transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortField === field ? 'text-accent-orange' : 'text-base-600'}`}
        />
      </div>
    </th>
  );

  if (routes.length === 0) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <p className="text-base-500 text-sm">加载样例后显示线路明细</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-base-700 flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-white">线路明细</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-base-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showBottleneckOnly}
              onChange={(e) => setShowBottleneckOnly(e.target.checked)}
              className="rounded border-base-600 bg-base-800 text-accent-orange focus:ring-accent-orange"
            />
            仅显示瓶颈
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-base-500" />
            <input
              type="text"
              placeholder="搜索线路..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-base-800 border border-base-600 text-sm text-white placeholder-base-500 focus:outline-none focus:border-accent-orange w-40"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead className="bg-base-900">
            <tr>
              <SortHeader field="id" label="线路" />
              <th className="table-header">起点</th>
              <th className="table-header">终点</th>
              <SortHeader field="capacity" label="容量" />
              <SortHeader field="flow" label="流量" />
              <SortHeader field="utilization" label="利用率" />
              <th className="table-header">状态</th>
              <th className="table-header">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRoutes.map((route, idx) => (
              <tr
                key={route.id}
                className={`table-row-hover ${idx % 2 === 1 ? 'bg-base-800/50' : ''} ${
                  route.isBottleneck ? 'bg-accent-red/5' : ''
                }`}
                onClick={() => handleRowClick(route)}
              >
                <td className="table-cell font-mono text-white">{route.id}</td>
                <td className="table-cell font-mono">{route.from}</td>
                <td className="table-cell font-mono">{route.to}</td>
                <td className="table-cell font-mono">{route.capacity}</td>
                <td className="table-cell font-mono">{route.flow}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2">
                    <div className="progress-bar-bg w-20">
                      <div
                        className={`progress-bar-fill ${getUtilizationColor(route.utilization)}`}
                        style={{ width: `${Math.min(100, route.utilization * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">
                      {(route.utilization * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="table-cell">
                  {route.isBottleneck ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs">
                      <span className="pulse-dot bg-accent-red animate-pulse" />
                      瓶颈
                    </span>
                  ) : route.capacity === 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-base-700 text-base-500 text-xs">
                      零容量
                    </span>
                  ) : route.isDisabled ? (
                    <span className="inline-flex items-center px-2 py-0.5 bg-base-700 text-base-500 text-xs">
                      已禁用
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs">
                      正常
                    </span>
                  )}
                </td>
                <td className="table-cell">
                  <button
                    className="btn flex items-center gap-1 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(route);
                    }}
                  >
                    <GitBranch className="w-3 h-3" />
                    追溯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {analysisResult && (
        <div className="p-3 border-t border-base-700 text-xs text-base-500 flex items-center justify-between">
          <span>
            显示 {filteredAndSortedRoutes.length} / {routes.length} 条线路
          </span>
          <span className="font-mono">
            平均利用率: {(analysisResult.utilizationRate * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
