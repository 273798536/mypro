import { useState } from 'react';
import { MapPin, Route, Info, Layers, Power, ShieldOff, Shield, ToggleLeft } from 'lucide-react';
import { useStore } from '@/store/useStore';
import BuildingTopology from '@/components/BuildingTopology';
import { createRouteAnalyzer, getBuildingName } from '@/utils/graphUtils';
import { cn } from '@/lib/utils';

export default function BuildingMap() {
  const { buildings, routeEdges, workOrders, schedules, selectedDate, toggleBuildingAccess, toggleRouteEdge } = useStore();
  const [showRouteAnalysis, setShowRouteAnalysis] = useState(false);
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);

  const analyzer = createRouteAnalyzer(buildings, routeEdges);
  const breakpoints = analyzer.detectBreakpoints();

  const todaySchedules = schedules.filter(s => s.date === selectedDate);
  const buildingWorkOrders = (buildingId: string) => workOrders.filter(wo => wo.buildingId === buildingId && wo.scheduledTime.startsWith(selectedDate));

  const getInspectorRoute = (inspectorId: string) => {
    const inspectorSchedule = todaySchedules.find(s => s.inspectorId === inspectorId);
    if (!inspectorSchedule) return [];
    return analyzer.findOptimalRoute(inspectorSchedule.buildingIds[0] || 'b1', inspectorSchedule.buildingIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">楼栋巡检图</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRouteAnalysis(!showRouteAnalysis)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              showRouteAnalysis
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            )}
          >
            <Route size={18} />
            路线分析
          </button>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-slate-400" />
            <select
              value={selectedInspector || ''}
              onChange={(e) => setSelectedInspector(e.target.value || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部巡检员</option>
              {schedules.filter(s => s.date === selectedDate).map(s => {
                const inspector = useStore.getState().inspectors.find(i => i.id === s.inspectorId);
                return (
                  <option key={s.id} value={s.inspectorId}>{inspector?.name} - {s.shift === 'morning' ? '早班' : '晚班'}</option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" />
            <span className="text-sm text-slate-500">楼栋总数</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{buildings.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <Route size={20} className="text-emerald-500" />
            <span className="text-sm text-slate-500">巡检路线</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{routeEdges.filter(e => e.isActive).length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <Info size={20} className="text-orange-500" />
            <span className="text-sm text-slate-500">路线断点</span>
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-2">{breakpoints.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-red-500" />
            <span className="text-sm text-slate-500">门禁关闭</span>
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">{buildings.filter(b => !b.accessOpen).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">楼栋拓扑图</h2>
            <p className="text-sm text-slate-500 mt-1">点击楼栋查看详细信息和关联工单</p>
          </div>
          <div className="p-4">
            <BuildingTopology />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">路线断点分析</h2>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {breakpoints.map(bp => {
                const edgeId = bp.id.replace('break-', '');
                const edge = routeEdges.find(e => e.id === edgeId);
                const isInactive = edge && !edge.isActive;
                return (
                <div key={bp.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Route size={14} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{bp.reason}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        影响: {bp.affectedRoutes.join(', ') || '无'}
                      </div>
                    </div>
                    {isInactive && (
                      <button
                        onClick={() => toggleRouteEdge(edgeId)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        <Power size={12} />
                        恢复路线
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
              {breakpoints.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  无路线断点
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">门禁管理</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {buildings.map(building => (
                <div key={building.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    {building.accessOpen ? (
                      <Shield size={16} className="text-emerald-500" />
                    ) : (
                      <ShieldOff size={16} className="text-red-500" />
                    )}
                    <span className="text-sm font-medium text-slate-700">{building.name}</span>
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded font-medium',
                      building.accessOpen
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {building.accessOpen ? '开放' : '关闭'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleBuildingAccess(building.id)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors',
                      building.accessOpen
                        ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    )}
                  >
                    <ToggleLeft size={12} />
                    {building.accessOpen ? '关闭门禁' : '恢复门禁'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {selectedInspector && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">巡检员最优路线</h2>
              </div>
              <div className="p-4">
                <div className="text-sm text-slate-600 space-y-2">
                  {getInspectorRoute(selectedInspector).map((buildingId, index) => (
                    <div key={buildingId} className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span>{getBuildingName(buildingId, buildings)}</span>
                      {index < getInspectorRoute(selectedInspector).length - 1 && (
                        <div className="flex-1 border-t border-dashed border-slate-300 mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">今日工单分布</h2>
            </div>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {buildings.slice(0, 8).map(building => {
                const orders = buildingWorkOrders(building.id);
                if (orders.length === 0) return null;
                return (
                  <div key={building.id} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{building.name}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {orders.length} 个工单
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {orders.map(o => o.description).join('、')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showRouteAnalysis && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">连通性分析报告</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-6">
              {['A', 'B', 'C', 'D'].map(zone => {
                const zoneBuildings = buildings.filter(b => b.zone === zone).map(b => b.id);
                const isConnected = analyzer.checkConnectivity(zoneBuildings);
                return (
                  <div key={zone} className={cn(
                    'p-4 rounded-lg border-2',
                    isConnected ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                  )}>
                    <div className="text-lg font-bold text-slate-800">{zone}区</div>
                    <div className={cn('text-sm mt-1', isConnected ? 'text-green-600' : 'text-red-600')}>
                      {isConnected ? '✓ 完全连通' : '✗ 存在断点'}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      {zoneBuildings.length} 栋楼
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 mb-2">图论算法说明</div>
              <div className="text-xs text-slate-500 space-y-1">
                <p>• 采用广度优先搜索(BFS)算法检测楼栋连通性</p>
                <p>• 使用贪心算法计算巡检员最优路线（最近邻居优先）</p>
                <p>• 路线断点检测基于边的激活状态和连通分量分析</p>
                <p>• 数据来源：楼栋拓扑图数据 + 巡检排程数据</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
