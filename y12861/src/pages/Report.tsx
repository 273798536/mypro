import { useState } from 'react';
  import {
    FileText,
    AlertTriangle,
  Clock,
  MapPin,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Download,
  Navigation,
  Database,
  FileQuestion,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fishingRecords,
  fishingSpots,
  dataGaps,
  buoys,
  buoyStatusRecords,
  riskNotices,
  waterQualityList,
  tideDataList,
} from '@/data/mockData';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function Report() {
  const navigate = useNavigate();
  const { reviewItems } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'buoys'>('overview');

  const confirmedCount = reviewItems.filter((i) => i.status === 'confirmed').length;
  const pendingCount = reviewItems.filter((i) => i.status === 'pending').length;
  const rejectedCount = reviewItems.filter((i) => i.status === 'rejected').length;
  const totalWeight = fishingRecords.reduce((sum, r) => sum + r.weight, 0);

  const offlineBuoys = buoys.filter((b) => b.status !== 'online');

  const getBuoyStatusTimeline = (buoyId: string) => {
    return buoyStatusRecords
      .filter((bsr) => bsr.buoyId === buoyId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getSpotName = (spotId: string) => {
    return fishingSpots.find((s) => s.id === spotId)?.name || '未知';
  };

  const gapTypeLabels: Record<string, string> = {
    risk_notice: '风险通报',
    water_quality: '水质数据',
    tide_data: '潮汐数据',
    buoy_status: '浮标状态',
  };

  const priorityColors = {
    high: 'text-red-400 bg-red-500/20',
    medium: 'text-orange-400 bg-orange-500/20',
    low: 'text-yellow-400 bg-yellow-500/20',
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
      <div className="p-6 border-b border-slate-800 sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">复核报告</h2>
              <p className="text-sm text-slate-400">海钓比赛渔获台账 · 海事处专用视图</p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors">
            <Download size={16} />
            导出报告
          </button>
        </div>

        <div className="flex gap-1 mt-4">
          {[
            { id: 'overview', label: '总览', icon: FileText },
            { id: 'gaps', label: '材料缺口', icon: FileQuestion },
            { id: 'buoys', label: '浮标追踪', icon: Navigation },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'gaps' && dataGaps.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                    {dataGaps.length}
                  </span>
                )}
                {tab.id === 'buoys' && offlineBuoys.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full">
                    {offlineBuoys.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6">
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5">
                <div className="text-3xl font-bold text-white">{fishingRecords.length}</div>
                <div className="text-sm text-slate-400 mt-1">渔获记录</div>
                <div className="text-xs text-slate-500 mt-2">总重量 {totalWeight.toFixed(1)} kg</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                <div className="text-3xl font-bold text-emerald-400">{confirmedCount}</div>
                <div className="text-sm text-emerald-400/80 mt-1">已通过</div>
                <div className="text-xs text-emerald-400/50 mt-2">
                  {Math.round((confirmedCount / fishingRecords.length) * 100)}%
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                <div className="text-3xl font-bold text-yellow-400">{pendingCount}</div>
                <div className="text-sm text-yellow-400/80 mt-1">待复核</div>
                <div className="text-xs text-yellow-400/50 mt-2">
                  {Math.round((pendingCount / fishingRecords.length) * 100)}%
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                <div className="text-3xl font-bold text-red-400">{rejectedCount}</div>
                <div className="text-sm text-red-400/80 mt-1">已驳回</div>
                <div className="text-xs text-red-400/50 mt-2">
                  {Math.round((rejectedCount / fishingRecords.length) * 100)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">材料完整性</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">渔获记录</span>
                      <span className="text-white">{fishingRecords.length} 条</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">水质记录</span>
                      <span className="text-white">{waterQualityList.length} 条</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: '85%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">风险通报</span>
                      <span className="text-white">
                        {riskNotices.filter((r) => !r.isMissing).length}/
                        {riskNotices.length}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${(riskNotices.filter((r) => !r.isMissing).length / riskNotices.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">潮汐数据</span>
                      <span className="text-white">{tideDataList.length} 天</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: '75%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">渔点分布</h3>
                <div className="space-y-2">
                  {fishingSpots.map((spot) => {
                    const spotRecords = fishingRecords.filter((r) => r.spotId === spot.id);
                    const hasWarning = waterQualityList.some(
                      (wq) => wq.spotId === spot.id && wq.isWarning
                    );
                    return (
                      <div
                        key={spot.id}
                        className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <MapPin size={14} className="text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                              {spot.name}
                              {hasWarning && (
                                <AlertTriangle size={12} className="text-orange-400" />
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{spot.area}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {spotRecords.length} 条
                          </div>
                          <div className="text-xs text-slate-500">
                            {spotRecords.reduce((s, r) => s + r.weight, 0).toFixed(1)} kg
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-400">
                    数据完整性提醒
                  </h3>
                  <p className="text-sm text-orange-400/70 mt-1">
                    本次复核共有 {dataGaps.length} 处材料缺口，系统已采用容错处理，
                    在数据不完整的情况下先完成可计算部分。以下缺口需海事安全员补充材料后重新计算。
                  </p>
                  <button
                    onClick={() => setActiveTab('gaps')}
                    className="mt-3 text-sm text-orange-400 hover:text-orange-300 underline"
                  >
                    查看缺口清单 →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <FileQuestion size={20} className="text-orange-400" />
                <h3 className="text-lg font-semibold text-white">材料缺口清单</h3>
              </div>
              <p className="text-sm text-slate-400">
                以下材料缺失或不完整，系统已采用降级策略完成可计算部分。
                请联系相关部门补充材料后重新复核。
              </p>
            </div>

            {dataGaps.map((gap, index) => (
              <div
                key={gap.id}
                className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                      <Database size={18} className="text-slate-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-medium text-white">
                          {gap.description}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            priorityColors[gap.priority]
                          )}
                        >
                          {gap.priority === 'high' && '高优先级'}
                          {gap.priority === 'medium' && '中优先级'}
                          {gap.priority === 'low' && '低优先级'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {gap.spotName}
                        </span>
                        <span>类型: {gapTypeLabels[gap.type]}</span>
                      </div>
                      {gap.relatedMaterial && (
                        <div className="mt-2 text-xs text-slate-500">
                          关联材料: <span className="text-slate-400">{gap.relatedMaterial}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500">缺口 #{index + 1}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>待补充材料</span>
                  </div>
                  <button className="px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-md hover:bg-slate-700 transition-colors">
                    标记已补充
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'buoys' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Navigation size={20} className="text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">浮标状态追踪</h3>
              </div>
              <p className="text-sm text-slate-400">
                实时追踪各浮标运行状态，离线浮标将显示卡点位置和原因，
                便于海事处掌握数据完整性。
              </p>
            </div>

            {buoys.map((buoy) => {
              const timeline = getBuoyStatusTimeline(buoy.id);
              const spotName = getSpotName(buoy.spotId);
              return (
                <div
                  key={buoy.id}
                  className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          buoy.status === 'online' && 'bg-emerald-500/20',
                          buoy.status === 'offline' && 'bg-red-500/20',
                          buoy.status === 'maintenance' && 'bg-yellow-500/20'
                        )}
                      >
                        <Navigation
                          size={22}
                          className={cn(
                            buoy.status === 'online' && 'text-emerald-400',
                            buoy.status === 'offline' && 'text-red-400',
                            buoy.status === 'maintenance' && 'text-yellow-400'
                          )}
                        />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-white">{buoy.name}</div>
                        <div className="text-sm text-slate-400 mt-0.5">
                          关联渔点: {spotName}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          {buoy.lat.toFixed(4)}, {buoy.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 text-sm rounded-full font-medium',
                        buoy.status === 'online' && 'bg-emerald-500/20 text-emerald-400',
                        buoy.status === 'offline' && 'bg-red-500/20 text-red-400',
                        buoy.status === 'maintenance' && 'bg-yellow-500/20 text-yellow-400'
                      )}
                    >
                      {buoy.status === 'online' && '在线运行'}
                      {buoy.status === 'offline' && '离线'}
                      {buoy.status === 'maintenance' && '维护中'}
                    </span>
                  </div>

                  {timeline.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="text-sm font-medium text-slate-200 mb-3">
                        状态变更记录
                      </div>
                      <div className="space-y-3">
                        {timeline.map((record, idx) => (
                          <div key={record.id} className="flex items-start gap-3">
                            <div className="relative flex flex-col items-center">
                              <div
                                className={cn(
                                  'w-3 h-3 rounded-full flex-shrink-0',
                                  record.isOnline ? 'bg-emerald-400' : 'bg-red-400'
                                )}
                              />
                              {idx < timeline.length - 1 && (
                                <div className="w-px h-full bg-slate-700 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white">
                                  {record.isOnline ? '恢复在线' : '设备离线'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {record.timestamp}
                                </span>
                              </div>
                              {record.offlineReason && (
                                <p className="text-xs text-slate-400 mt-1">
                                  原因: {record.offlineReason}
                                </p>
                              )}
                              {record.materialSource && (
                                <p className="text-xs text-slate-500 mt-1">
                                  材料来源: 
                                  <span className="text-slate-400 ml-1">
                                    {record.materialSource}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {buoy.status === 'offline' && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertTriangle size={14} />
                        <span className="font-medium">当前卡点说明</span>
                      </div>
                      <p className="text-xs text-red-400/70 mt-1">
                        该浮标离线期间数据采集中断，导致相关渔点的水质监测数据缺失。
                        对应材料卡片在「{timeline[timeline.length - 1]?.materialSource || '未知材料'}」中可追溯。
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
