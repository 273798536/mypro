import React from 'react';
import { useTrackerStore } from '@/store/useTrackerStore';
import { cn } from '@/lib/utils';
import type { BuoyStatus } from '@/types';
import { BUOY_STATUS_LABEL } from '@/types';
import StatCard from '@/components/Dashboard/StatCard';
import BuoyCard from '@/components/Dashboard/BuoyCard';
import StatusLegend from '@/components/Dashboard/StatusLegend';
import { Gauge, Radio, AlertTriangle, AlertOctagon, Clock, Activity, Search, X } from 'lucide-react';

const allStatuses: BuoyStatus[] = ['normal', 'offline', 'anomaly', 'out_of_range', 'pending'];

const Dashboard: React.FC = () => {
  const {
    buoys,
    screenshotMode,
    statusFilter,
    searchKeyword,
    setStatusFilter,
    setSearchKeyword,
    getFilteredBuoys,
  } = useTrackerStore();

  const filteredBuoys = getFilteredBuoys();
  const total = buoys.length;

  const counts = {
    total,
    normal: buoys.filter((b) => b.status === 'normal').length,
    offline: buoys.filter((b) => b.status === 'offline').length,
    anomaly: buoys.filter((b) => b.status === 'anomaly').length,
    out_of_range: buoys.filter((b) => b.status === 'out_of_range').length,
    pending: buoys.filter((b) => b.status === 'pending').length,
  };

  const toggleStatus = (status: BuoyStatus) => {
    if (statusFilter.includes(status)) {
      setStatusFilter(statusFilter.filter((s) => s !== status));
    } else {
      setStatusFilter([...statusFilter, status]);
    }
  };

  const clearStatusFilter = () => {
    setStatusFilter([]);
  };

  return (
    <div className={cn('flex-1 min-h-0 overflow-auto', !screenshotMode && '')}>
      <div className={cn('space-y-6', '')}>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="section-title !text-2xl mb-2">浮标监控仪表盘</h1>
            <p className="text-ocean-400 text-sm">
              实时监控 {total} 个浮标运行状态 · 当前显示 {filteredBuoys.length} 个筛选结果
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="浮标总数"
            value={counts.total}
            total={total}
            icon={Activity}
            color="ocean"
            screenshotMode={screenshotMode}
          />
          <StatCard
            title="运行正常"
            value={counts.normal}
            total={total}
            icon={Gauge}
            color="seaweed"
            screenshotMode={screenshotMode}
          />
          <StatCard
            title="离线浮标"
            value={counts.offline}
            total={total}
            icon={Radio}
            color="ocean"
            screenshotMode={screenshotMode}
          />
          <StatCard
            title="数据异常"
            value={counts.anomaly}
            total={total}
            icon={AlertTriangle}
            color="coral"
            screenshotMode={screenshotMode}
          />
          <StatCard
            title="越界预警"
            value={counts.out_of_range}
            total={total}
            icon={AlertOctagon}
            color="coral-bright"
            screenshotMode={screenshotMode}
          />
          <StatCard
            title="待复核"
            value={counts.pending}
            total={total}
            icon={Clock}
            color="sand"
            screenshotMode={screenshotMode}
          />
        </div>

        <div className="nautical-card p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-ocean-400 flex-shrink-0">状态筛选：</span>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((status) => {
                  const isActive = statusFilter.includes(status);
                  return (
                    <button
                      key={status}
                      onClick={() => toggleStatus(status)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-200 border',
                        isActive
                          ? status === 'normal'
                            ? 'bg-seaweed-500/20 border-seaweed-500/50 text-seaweed-300'
                            : status === 'offline'
                            ? 'bg-ocean-500/20 border-ocean-500/50 text-ocean-300'
                            : status === 'anomaly'
                            ? 'bg-coral-500/20 border-coral-500/50 text-coral-300'
                            : status === 'out_of_range'
                            ? 'bg-coral-500/25 border-coral-400/60 text-coral-300 shadow-[0_0_12px_rgba(232,72,85,0.2)]'
                            : 'bg-sand-500/20 border-sand-500/50 text-sand-300'
                          : 'bg-ocean-800/40 border-ocean-700/50 text-ocean-400 hover:border-ocean-600 hover:text-ocean-200'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', `status-${status}`)} />
                      {BUOY_STATUS_LABEL[status]}
                      <span className="ml-1 text-xs opacity-70">
                        {counts[status]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {statusFilter.length > 0 && (
                <button
                  onClick={clearStatusFilter}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-ocean-400 hover:text-ocean-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                  清除筛选
                </button>
              )}
            </div>

            <div className="lg:ml-auto w-full lg:w-72">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-400" />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ocean-400 hover:text-ocean-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索浮标名称、编号、操作员..."
                  className="input-nautical pl-10 pr-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title !text-lg">浮标状态矩阵</h2>
              <span className="text-sm text-ocean-400">
                共 <span className="text-seafoam-300 font-medium">{filteredBuoys.length}</span> 个浮标
              </span>
            </div>

            {filteredBuoys.length === 0 ? (
              <div className="nautical-card p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ocean-800/50 flex items-center justify-center">
                  <Search className="w-8 h-8 text-ocean-500" />
                </div>
                <h3 className="text-ocean-300 font-medium mb-2">未找到匹配的浮标</h3>
                <p className="text-sm text-ocean-500">请尝试调整筛选条件或搜索关键词</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filteredBuoys.map((buoy) => (
                  <BuoyCard key={buoy.id} buoy={buoy} screenshotMode={screenshotMode} />
                ))}
              </div>
            )}
          </div>

          {!screenshotMode && (
            <aside className="hidden xl:block w-72 flex-shrink-0">
              <div className="sticky top-24 space-y-4">
                <StatusLegend screenshotMode={screenshotMode} />
              </div>
            </aside>
          )}

          {screenshotMode && (
            <aside className="w-80 flex-shrink-0">
              <div className="space-y-4">
                <StatusLegend screenshotMode={screenshotMode} />
              </div>
            </aside>
          )}
        </div>

        {!screenshotMode && (
          <div className="xl:hidden">
            <StatusLegend screenshotMode={screenshotMode} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
