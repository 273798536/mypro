import { useAppStore } from '@/store';
import { 
  Users, MapPin, FileBarChart, AlertTriangle, 
  TrendingUp, Clock, CheckCircle, Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { 
    employees, stations, plans, overflowRecords, currentPlanId, 
    getFilteredChartData, getFilteredAssignments, filters, setFilters
  } = useAppStore();
  
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const missingDataCount = employees.filter(e => e.status === 'missing_data').length;
  const candidateStations = stations.filter(s => s.status === 'candidate').length;
  const unresolvedOverflows = overflowRecords.filter(r => !r.isResolved).length;
  
  const chartData = currentPlanId ? getFilteredChartData(currentPlanId) : stations.filter(s => s.status !== 'closed').map(station => ({
    name: station.name,
    assigned: 0,
    capacity: station.capacity,
    isOverflow: false,
  }));

  const filteredAssignments = currentPlanId ? getFilteredAssignments(currentPlanId) : [];
  
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const hasFilters = filters.department || filters.status || filters.search;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Filter className="w-5 h-5 text-gray-400" />
        <select
          value={filters.department}
          onChange={(e) => setFilters({ department: e.target.value })}
          className="input-field w-36 text-sm"
        >
          <option value="">全部部门</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value })}
          className="input-field w-36 text-sm"
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="missing_data">数据缺失</option>
        </select>
        <input
          type="text"
          placeholder="搜索..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="input-field w-48 text-sm"
        />
        {hasFilters && (
          <button 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            onClick={() => setFilters({ department: '', status: '', search: '' })}
          >
            清除筛选
          </button>
        )}
        {hasFilters && (
          <span className="badge badge-info text-xs">
            筛选已生效：图表和明细已同步
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">有效员工</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeEmployees}</p>
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {missingDataCount} 人信息缺失
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">候选站点</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{candidateStations}</p>
              <p className="text-xs text-gray-500 mt-2">
                {stations.filter(s => s.status === 'closed').length} 个已关闭
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">排程方案</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{plans.length}</p>
              {plans.length > 0 && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  最优间隙 {plans[0].optimalityGap.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileBarChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">容量超限</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{unresolvedOverflows}</p>
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                待处理
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              unresolvedOverflows > 0 ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {unresolvedOverflows > 0 ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">站点容量分布</h3>
            {hasFilters && <span className="badge badge-info">按筛选</span>}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="assigned" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.isOverflow ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
                <Bar dataKey="capacity" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {hasFilters ? '筛选后排程分配' : '最新排程分配'}
            </h3>
            <span className="text-sm text-gray-500">{filteredAssignments.length} 条记录</span>
          </div>
          <div className="space-y-3">
            {filteredAssignments.slice(0, 5).map(assignment => {
              const employee = employees.find(e => e.id === assignment.employeeId);
              const station = stations.find(s => s.id === assignment.stationId);
              return (
                <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-700">
                      {employee?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{employee?.name}</p>
                      <p className="text-xs text-gray-500">{employee?.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{station?.name}</p>
                    <p className="text-xs text-gray-500">{assignment.distance.toFixed(2)} km</p>
                  </div>
                </div>
              );
            })}
            {filteredAssignments.length === 0 && (
              <p className="text-center text-gray-400 py-8">
                {hasFilters ? '当前筛选无匹配结果' : '暂无排程方案'}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">数据质量检查</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="font-medium text-green-800">地址完整</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {employees.filter(e => e.address && e.latitude !== 0).length}
            </p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="font-medium text-amber-800">晚补录入</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {employees.filter(e => e.isLateSupplement).length}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="font-medium text-red-800">字段缺失</p>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {employees.filter(e => e.status === 'missing_data').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
