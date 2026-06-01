import { useState } from 'react';
import { useAppStore } from '@/store';
import { 
  AlertTriangle, Clock, CheckCircle, FileText, History,
  Filter, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { 
    overflowRecords, plans, employees, stations, 
    resolveOverflow, getAssignmentsByPlanId 
  } = useAppStore();
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecords(newExpanded);
  };

  const filteredRecords = overflowRecords.filter(record => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'unresolved') return !record.isResolved;
    if (filterStatus === 'resolved') return record.isResolved;
    return true;
  });

  const handleExportReport = () => {
    const exportData = overflowRecords.map(record => {
      const plan = plans.find(p => p.id === record.planId);
      const station = stations.find(s => s.id === record.stationId);
      return {
        '记录ID': record.id,
        '排程方案': plan?.name || '',
        '站点名称': station?.name || '',
        '站点地址': station?.address || '',
        '超限人数': record.overflowCount,
        '发生时间': new Date(record.createdAt).toLocaleString('zh-CN'),
        '状态': record.isResolved ? '已处理' : '待处理',
        '备注': record.remark,
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '容量超限记录');
    XLSX.writeFile(wb, `容量超限报告_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
  };

  const handleExportFullReport = () => {
    const allData: any[] = [];
    
    plans.forEach(plan => {
      const assignments = getAssignmentsByPlanId(plan.id);
      assignments.forEach(a => {
        const employee = employees.find(e => e.id === a.employeeId);
        const station = stations.find(s => s.id === a.stationId);
        allData.push({
          '排程方案': plan.name,
          '员工姓名': employee?.name || '',
          '部门': employee?.department || '',
          '员工住址': employee?.address || '',
          '员工坐标': `${employee?.latitude}, ${employee?.longitude}`,
          '分配站点': station?.name || '',
          '站点地址': station?.address || '',
          '站点坐标': `${station?.latitude}, ${station?.longitude}`,
          '站点容量': station?.capacity || '',
          '步行距离(km)': a.distance.toFixed(2),
          '乘车顺序': a.routeOrder,
          '员工备注': employee?.remark || '',
          '站点备注': station?.remark || '',
          '是否晚补录入': employee?.isLateSupplement ? '是' : '否',
        });
      });
    });
    
    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '完整调度报告');
    XLSX.writeFile(wb, `完整调度报告_${new Date().toLocaleDateString('zh-CN')}.xlsx`);
  };

  const unresolvedCount = overflowRecords.filter(r => !r.isResolved).length;
  const resolvedCount = overflowRecords.filter(r => r.isResolved).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="input-field w-40"
            >
              <option value="all">全部记录</option>
              <option value="unresolved">待处理</option>
              <option value="resolved">已处理</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn-secondary flex items-center gap-2"
            onClick={handleExportReport}
          >
            <FileText className="w-4 h-4" />
            导出超限报告
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={handleExportFullReport}
          >
            <Download className="w-4 h-4" />
            导出完整报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">待处理超限</p>
              <p className="text-2xl font-bold text-gray-900">{unresolvedCount}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已处理超限</p>
              <p className="text-2xl font-bold text-gray-900">{resolvedCount}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">历史总记录</p>
              <p className="text-2xl font-bold text-gray-900">{overflowRecords.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          容量超限历史记录
          <span className="text-sm text-gray-400 font-normal">
            (不可覆盖，永久留痕)
          </span>
        </h3>
        
        <div className="space-y-4">
          {filteredRecords.map((record) => {
            const plan = plans.find(p => p.id === record.planId);
            const station = stations.find(s => s.id === record.stationId);
            const isExpanded = expandedRecords.has(record.id);
            
            return (
              <div 
                key={record.id} 
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  record.isResolved ? 'border-gray-200' : 'border-red-200'
                }`}
              >
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer ${
                    record.isResolved ? 'bg-gray-50' : 'bg-red-50'
                  }`}
                  onClick={() => toggleExpand(record.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      record.isResolved ? 'bg-gray-200' : 'bg-red-100'
                    }`}>
                      {record.isResolved ? (
                        <CheckCircle className="w-5 h-5 text-gray-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{station?.name}</h4>
                        <span className={`badge ${record.isResolved ? 'badge-success' : 'badge-danger'}`}>
                          {record.isResolved ? '已处理' : '待处理'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{plan?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">超限人数</p>
                      <p className="font-bold text-red-600">{record.overflowCount} 人</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        发生时间
                      </p>
                      <p className="font-medium text-gray-900">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="grid grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 text-sm">站点信息</h5>
                        <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                          <p><span className="text-gray-500">站点：</span>{station?.name}</p>
                          <p><span className="text-gray-500">地址：</span>{station?.address}</p>
                          <p><span className="text-gray-500">容量：</span>{station?.capacity} 人</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 text-sm">排程方案</h5>
                        <div className="p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                          <p><span className="text-gray-500">方案：</span>{plan?.name}</p>
                          <p><span className="text-gray-500">创建时间：</span>{new Date(plan?.createdAt || '').toLocaleDateString('zh-CN')}</p>
                          <p><span className="text-gray-500">总成本：</span>¥{plan?.totalCost}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 text-sm">超限详情</h5>
                        <div className="p-3 bg-red-50 rounded-lg space-y-1 text-sm">
                          <p><span className="text-gray-500">超限人数：</span><span className="text-red-600 font-medium">{record.overflowCount} 人</span></p>
                          <p><span className="text-gray-500">发生时间：</span>{new Date(record.createdAt).toLocaleString('zh-CN')}</p>
                          <p><span className="text-gray-500">记录ID：</span><code className="text-xs bg-red-100 px-1 rounded">{record.id}</code></p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 text-sm">处理操作</h5>
                        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                          <p className="text-sm text-gray-600">{record.remark}</p>
                          {!record.isResolved && (
                            <button
                              className="btn-primary w-full text-sm py-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveOverflow(record.id);
                              }}
                            >
                              标记为已处理
                            </button>
                          )}
                          {record.isResolved && (
                            <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              已标记为处理
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h5 className="font-medium text-gray-700 text-sm mb-3">
                        该站点分配的员工列表（可反查回站点候选）
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const assignments = record.planId ? getAssignmentsByPlanId(record.planId).filter(a => a.stationId === record.stationId) : [];
                          return assignments.map(a => {
                            const employee = employees.find(e => e.id === a.employeeId);
                            return (
                              <span 
                                key={a.id} 
                                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                              >
                                {employee?.name}
                                <span className="text-primary-400 text-xs">({employee?.department})</span>
                              </span>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">暂无容量超限记录</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">调度报告 - 复核用对应关系表</h3>
        <p className="text-sm text-gray-500 mb-4">
          下表展示员工住址、站点候选和导出路线的完整对应关系，便于行政复核
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">员工信息</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">员工住址</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">类型标记</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">候选站点</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">站点地址</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">站点容量</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">距离</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.slice(0, 10).map(employee => {
                const nearestStation = stations
                  .filter(s => s.status !== 'closed')
                  .map(s => ({
                    station: s,
                    distance: Math.sqrt(
                      Math.pow(employee.latitude - s.latitude, 2) + 
                      Math.pow(employee.longitude - s.longitude, 2)
                    ) * 111
                  }))
                  .sort((a, b) => a.distance - b.distance)[0];
                
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{employee.name}</span>
                        <span className="text-gray-400 text-xs">{employee.department}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{employee.address || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {employee.isLateSupplement && <span className="badge badge-warning mr-1">晚补</span>}
                      {employee.status === 'missing_data' && <span className="badge badge-danger">缺字段</span>}
                      {employee.remark && <span className="badge badge-info">有备注</span>}
                    </td>
                    <td className="px-3 py-2 font-medium text-primary-700">{nearestStation?.station.name}</td>
                    <td className="px-3 py-2 text-gray-600">{nearestStation?.station.address}</td>
                    <td className="px-3 py-2 text-center font-mono">{nearestStation?.station.capacity}</td>
                    <td className="px-3 py-2 text-center font-mono">{nearestStation?.distance.toFixed(2)} km</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
