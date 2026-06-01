import { useState } from 'react';
import { useAppStore } from '@/store';
import { Search, Plus, Edit, Trash2, Filter, Upload, MapPin } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { Employee } from '@/types';

export default function Employees() {
  const { employees, stations, filters, setFilters, getFilteredEmployees, addEmployee, updateEmployee, deleteEmployee, currentPlanId, getAssignmentsByPlanId } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    department: '',
    address: '',
    latitude: 0,
    longitude: 0,
    status: 'active',
    remark: '',
    isLateSupplement: false,
  });

  const filteredEmployees = getFilteredEmployees();
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  
  const currentAssignments = currentPlanId ? getAssignmentsByPlanId(currentPlanId) : [];

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData(employee);
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        department: '',
        address: '',
        latitude: 0,
        longitude: 0,
        status: 'active',
        remark: '',
        isLateSupplement: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData);
    } else {
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        name: formData.name || '',
        department: formData.department || '',
        address: formData.address || '',
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        status: (!formData.address || formData.latitude === 0) ? 'missing_data' : 'active',
        remark: formData.remark || '',
        isLateSupplement: formData.isLateSupplement || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addEmployee(newEmployee);
    }
    setIsModalOpen(false);
  };

  const getAssignmentForEmployee = (employeeId: string) => {
    return currentAssignments.find(a => a.employeeId === employeeId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索员工姓名、地址..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="input-field pl-10 w-80"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filters.department}
              onChange={(e) => setFilters({ department: e.target.value })}
              className="input-field w-40"
            >
              <option value="">全部部门</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              className="input-field w-40"
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="missing_data">数据缺失</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            导入Excel
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => handleOpenModal()}
          >
            <Plus className="w-4 h-4" />
            新增员工
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">员工信息</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">部门</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">居住地址</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">分配站点</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">状态</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">备注</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEmployees.map((employee) => {
              const assignment = getAssignmentForEmployee(employee.id);
              const station = assignment ? useAppStore.getState().stations.find(s => s.id === assignment.stationId) : null;
              
              return (
                <tr 
                  key={employee.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    employee.status === 'missing_data' ? 'bg-red-50/50' : ''
                  } ${employee.isLateSupplement ? 'bg-amber-50/30' : ''}`}
                  onClick={() => setSelectedEmployeeId(selectedEmployeeId === employee.id ? null : employee.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        employee.status === 'missing_data' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-primary-100 text-primary-700'
                      }`}>
                        {employee.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{employee.id}</p>
                      </div>
                      {employee.isLateSupplement && (
                        <span className="badge badge-warning">晚补</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {employee.department || <span className="text-red-500">未填写</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className={employee.address ? 'text-gray-600' : 'text-red-500'}>
                        {employee.address || '地址未填写'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {station ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span className="text-gray-900 font-medium">{station.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">未分配</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${
                      employee.status === 'active' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {employee.status === 'active' ? '正常' : '数据缺失'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {employee.remark || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(employee); }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteEmployee(employee.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedEmployeeId && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">员工详情 - 双向查询</h3>
          {(() => {
            const employee = employees.find(e => e.id === selectedEmployeeId);
            const assignment = currentAssignments.find(a => a.employeeId === selectedEmployeeId);
            const station = assignment ? stations.find(s => s.id === assignment.stationId) : null;
            
            return (
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">员工住址</h4>
                  <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                    <p><span className="text-gray-500">姓名：</span>{employee?.name}</p>
                    <p><span className="text-gray-500">部门：</span>{employee?.department}</p>
                    <p><span className="text-gray-500">地址：</span>{employee?.address}</p>
                    <p><span className="text-gray-500">坐标：</span>{employee?.latitude}, {employee?.longitude}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">分配结果</h4>
                  <div className="p-4 bg-green-50 rounded-lg space-y-2">
                    {station ? (
                      <>
                        <p><span className="text-gray-500">站点：</span>{station.name}</p>
                        <p><span className="text-gray-500">距离：</span>{assignment?.distance.toFixed(2)} km</p>
                        <p><span className="text-gray-500">路线顺序：</span>第 {assignment?.routeOrder} 位</p>
                      </>
                    ) : (
                      <p className="text-gray-500">暂无分配</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">站点候选</h4>
                  <div className="p-4 bg-purple-50 rounded-lg space-y-2">
                    {station ? (
                      <>
                        <p><span className="text-gray-500">站点ID：</span>{station.id}</p>
                        <p><span className="text-gray-500">容量：</span>{station.capacity} 人</p>
                        <p><span className="text-gray-500">状态：</span>{station.status === 'candidate' ? '候选' : '已关闭'}</p>
                        <p><span className="text-gray-500">备注：</span>{station.remark || '-'}</p>
                      </>
                    ) : (
                      <p className="text-gray-500">请先分配站点</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
              {editingEmployee ? '编辑员工' : '新增员工'}
            </Dialog.Title>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">居住地址</label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude || 0}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude || 0}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lateSupplement"
                  checked={formData.isLateSupplement || false}
                  onChange={(e) => setFormData({ ...formData, isLateSupplement: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="lateSupplement" className="text-sm text-gray-700">晚补录入</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                className="btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                取消
              </button>
              <button 
                className="btn-primary"
                onClick={handleSave}
              >
                保存
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
