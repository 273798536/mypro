import { useState } from 'react';
import { useAppStore } from '@/store';
import { runIntegerPlanning, ExtendedAlgorithmResult } from '@/utils/algorithm';
import { 
  Play, Settings, BarChart3, CheckCircle, 
  AlertTriangle, RefreshCw, Download, Target, Zap
} from 'lucide-react';
import { SchedulePlan } from '@/types';
import * as XLSX from 'xlsx';

export default function Scheduling() {
  const { 
    employees, stations, plans, currentPlanId, setCurrentPlanId,
    addPlan, addOverflowRecord, updateStation, getFilteredAssignments, getFilteredChartData,
    overflowRecords, filters
  } = useAppStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [parameters, setParameters] = useState({
    maxWalkingDistance: 15,
    minStationEmployees: 2,
    costPerStation: 500,
  });
  const [lastSolveInfo, setLastSolveInfo] = useState<ExtendedAlgorithmResult | null>(null);

  const handleRunAlgorithm = async () => {
    setIsRunning(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const planId = `plan-${Date.now()}`;
    const result = runIntegerPlanning(employees, stations, parameters, planId);
    
    setLastSolveInfo(result);
    
    const newPlan: SchedulePlan = {
      id: planId,
      name: `排程方案 ${new Date().toLocaleDateString('zh-CN')}`,
      status: result.isFeasible ? 'completed' : 'failed',
      createdAt: new Date().toISOString(),
      parameters,
      totalCost: result.totalCost,
      totalEmployees: result.assignments.length,
      assignments: result.assignments,
      isFeasible: result.isFeasible,
      isOptimal: result.optimal,
      optimalityGap: result.gap,
      stationCost: result.stationCost,
      distanceCost: result.distanceCost,
      solveTimeMs: result.solveTimeMs,
      nodesExplored: result.nodesExplored,
      unassignedEmployees: result.unassignedEmployees,
      alternativePlans: result.alternativePlans,
    };
    
    addPlan(newPlan);
    setCurrentPlanId(planId);
    
    result.overflowRecords.forEach(record => {
      addOverflowRecord(record);
    });
    
    result.selectedStations.forEach(stationId => {
      updateStation(stationId, { status: 'selected' });
    });
    
    setIsRunning(false);
  };

  const handleExport = () => {
    if (!currentPlanId) return;
    
    const assignments = getFilteredAssignments(currentPlanId);
    const exportData = assignments.map(a => {
      const employee = employees.find(e => e.id === a.employeeId);
      const station = stations.find(s => s.id === a.stationId);
      return {
        '员工姓名': employee?.name || '',
        '部门': employee?.department || '',
        '员工住址': employee?.address || '',
        '分配站点': station?.name || '',
        '站点地址': station?.address || '',
        '步行距离(km)': a.distance.toFixed(2),
        '乘车顺序': a.routeOrder,
        '备注': employee?.remark || '',
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '班车排程');
    XLSX.writeFile(wb, `班车排程方案_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
  };

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const filteredAssignments = currentPlanId ? getFilteredAssignments(currentPlanId) : [];
  const currentOverflowCount = overflowRecords.filter(r => r.planId === currentPlanId && !r.isResolved).length;
  const hasFilters = filters.department || filters.status || filters.search;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={currentPlanId || ''}
            onChange={(e) => setCurrentPlanId(e.target.value || null)}
            className="input-field w-72"
          >
            <option value="">选择排程方案</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>
          {currentPlan && (
            <span className={`badge ${
              currentPlan.isFeasible ? 'badge-success' : 'badge-danger'
            }`}>
              {currentPlan.isFeasible ? '可行解' : '不可行'}
            </span>
          )}
          {currentPlan?.isOptimal && (
            <span className="badge badge-info">最优解</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn-secondary flex items-center gap-2"
            onClick={handleExport}
            disabled={!currentPlanId}
          >
            <Download className="w-4 h-4" />
            导出路线
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={handleRunAlgorithm}
            disabled={isRunning}
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunning ? '求解中...' : '运行整数规划'}
          </button>
        </div>
      </div>

      {lastSolveInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-1 text-blue-800">
              <Zap className="w-4 h-4" />
              求解耗时: <strong>{lastSolveInfo.solveTimeMs.toFixed(1)} ms</strong>
            </span>
            <span className="flex items-center gap-1 text-blue-800">
              <Target className="w-4 h-4" />
              探索节点: <strong>{lastSolveInfo.nodesExplored}</strong>
            </span>
            <span className="flex items-center gap-1 text-blue-800">
              最优间隙: <strong>{lastSolveInfo.gap.toFixed(2)}%</strong>
            </span>
            <span className={`flex items-center gap-1 ${lastSolveInfo.isFeasible ? 'text-green-700' : 'text-red-700'}`}>
              {lastSolveInfo.isFeasible ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {lastSolveInfo.isFeasible ? '方案可行' : '方案不可行'}
            </span>
            {lastSolveInfo.optimal && (
              <span className="flex items-center gap-1 text-green-700 font-medium">
                <CheckCircle className="w-4 h-4" />
                已证明最优
              </span>
            )}
            {lastSolveInfo.unassignedEmployees.length > 0 && (
              <span className="text-red-700">
                未分配员工: {lastSolveInfo.unassignedEmployees.length} 人
              </span>
            )}
            {lastSolveInfo.alternativePlans.length > 0 && (
              <span className="text-blue-700">
                备选方案: {lastSolveInfo.alternativePlans.length} 个
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        <div className="card col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            算法参数
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大步行距离: {parameters.maxWalkingDistance} km
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={parameters.maxWalkingDistance}
                onChange={(e) => setParameters({ ...parameters, maxWalkingDistance: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                站点最少人数: {parameters.minStationEmployees} 人
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={parameters.minStationEmployees}
                onChange={(e) => setParameters({ ...parameters, minStationEmployees: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                单站点成本: ¥{parameters.costPerStation}
              </label>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={parameters.costPerStation}
                onChange={(e) => setParameters({ ...parameters, costPerStation: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="card col-span-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            方案对比
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">方案名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">站点数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">员工数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">站点成本</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">距离成本</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">总成本</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">可行</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">最优</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">间隙</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => (
                  <tr 
                    key={plan.id} 
                    className={`hover:bg-gray-50 ${
                      currentPlanId === plan.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{plan.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(plan.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {new Set(plan.assignments.map(a => a.stationId)).size} 个
                    </td>
                    <td className="px-4 py-3 text-gray-900">{plan.totalEmployees} 人</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-sm">¥{plan.stationCost}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-sm">¥{plan.distanceCost.toFixed(0)}</td>
                    <td className="px-4 py-3 text-gray-900 font-mono font-medium">¥{plan.totalCost.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center">
                      {plan.isFeasible ? (
                        <CheckCircle className="w-5 h-5 text-green-500 inline" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 inline" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {plan.isOptimal ? (
                        <Target className="w-5 h-5 text-blue-500 inline" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm">
                      <span className={plan.optimalityGap === 0 ? 'text-green-600 font-medium' : 'text-amber-600'}>
                        {plan.optimalityGap.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        onClick={() => setCurrentPlanId(plan.id)}
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                      暂无排程方案，请点击"运行整数规划"创建
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {currentPlan && (
        <div className="grid grid-cols-5 gap-6">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总成本</p>
                <p className="text-2xl font-bold text-gray-900">¥{currentPlan.totalCost.toFixed(0)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已分配</p>
                <p className="text-2xl font-bold text-gray-900">{currentPlan.totalEmployees} 人</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">选中站点</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(currentPlan.assignments.map(a => a.stationId)).size} 个
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                currentPlan.isFeasible ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {currentPlan.isFeasible ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">可行性</p>
                <p className={`text-lg font-bold ${currentPlan.isFeasible ? 'text-green-700' : 'text-red-700'}`}>
                  {currentPlan.isFeasible ? '可行' : '不可行'}
                </p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                currentOverflowCount > 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${currentOverflowCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">容量超限</p>
                <p className="text-2xl font-bold text-gray-900">{currentOverflowCount} 处</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentPlan && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              分配详情 - 员工住址 → 站点候选 对应关系
            </h3>
            <div className="flex items-center gap-3">
              {hasFilters && <span className="badge badge-info">按筛选</span>}
              <span className="text-sm text-gray-500">{filteredAssignments.length} 条记录</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">员工</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">员工住址</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">距离</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">分配站点</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">站点容量</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">乘车顺序</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssignments.map((assignment) => {
                  const employee = employees.find(e => e.id === assignment.employeeId);
                  const station = stations.find(s => s.id === assignment.stationId);
                  const stationCount = currentPlan.assignments.filter(a => a.stationId === assignment.stationId).length;
                  const isOverflow = stationCount > (station?.capacity || 0);
                  
                  return (
                    <tr key={assignment.id} className={`hover:bg-gray-50 ${isOverflow ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-700">
                            {employee?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{employee?.name}</p>
                            <p className="text-xs text-gray-500">{employee?.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">
                        {employee?.address || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-gray-900">{assignment.distance.toFixed(2)} km</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{station?.name}</p>
                          <p className="text-xs text-gray-500">{station?.address}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${isOverflow ? 'text-red-600' : 'text-gray-900'}`}>
                          {stationCount} / {station?.capacity}
                        </span>
                        {isOverflow && <span className="text-red-500 text-xs ml-2">(超限)</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                          #{assignment.routeOrder}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      暂无分配记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
