import { useState } from 'react';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, MapPin, Users, AlertCircle } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { Station } from '@/types';

export default function Stations() {
  const { stations, currentPlanId, getStationEmployeeCount, addStation, updateStation, deleteStation } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Station>>({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    capacity: 20,
    status: 'candidate',
    remark: '',
  });

  const handleOpenModal = (station?: Station) => {
    if (station) {
      setEditingStation(station);
      setFormData(station);
    } else {
      setEditingStation(null);
      setFormData({
        name: '',
        address: '',
        latitude: 0,
        longitude: 0,
        capacity: 20,
        status: 'candidate',
        remark: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingStation) {
      updateStation(editingStation.id, formData);
    } else {
      const newStation: Station = {
        id: `sta-${Date.now()}`,
        name: formData.name || '',
        address: formData.address || '',
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        capacity: formData.capacity || 20,
        status: formData.status as 'candidate' | 'selected' | 'closed' || 'candidate',
        remark: formData.remark || '',
      };
      addStation(newStation);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">共 {stations.length} 个站点，其中候选 {stations.filter(s => s.status === 'candidate').length} 个</span>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => handleOpenModal()}
        >
          <Plus className="w-4 h-4" />
          新增站点
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {stations.map((station) => {
          const employeeCount = currentPlanId ? getStationEmployeeCount(station.id, currentPlanId) : 0;
          const capacityUsage = (employeeCount / station.capacity) * 100;
          const isOverflow = employeeCount > station.capacity;
          
          return (
            <div
              key={station.id}
              className={`card cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedStationId === station.id ? 'ring-2 ring-primary-500' : ''
              } ${station.status === 'closed' ? 'opacity-60' : ''}`}
              onClick={() => setSelectedStationId(selectedStationId === station.id ? null : station.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    station.status === 'closed' ? 'bg-gray-100' : 'bg-primary-100'
                  }`}>
                    <MapPin className={`w-6 h-6 ${
                      station.status === 'closed' ? 'text-gray-400' : 'text-primary-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{station.name}</h3>
                    <span className={`badge ${
                      station.status === 'candidate' ? 'badge-info' : 
                      station.status === 'closed' ? 'badge-danger' : 'badge-success'
                    }`}>
                      {station.status === 'candidate' ? '候选' : station.status === 'closed' ? '已关闭' : '已选中'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleOpenModal(station); }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={(e) => { e.stopPropagation(); deleteStation(station.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {station.address}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    已分配 / 容量
                  </span>
                  <span className={`font-medium ${isOverflow ? 'text-red-600' : 'text-gray-900'}`}>
                    {employeeCount} / {station.capacity} 人
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isOverflow ? 'bg-red-500' : 
                      capacityUsage > 80 ? 'bg-amber-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min(capacityUsage, 100)}%` }}
                  />
                </div>
                {isOverflow && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    容量超限 {employeeCount - station.capacity} 人
                  </div>
                )}
              </div>
              
              {station.remark && (
                <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                  {station.remark}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {selectedStationId && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">站点详情 - 分配明细</h3>
          {(() => {
            const station = stations.find(s => s.id === selectedStationId);
            const assignments = currentPlanId 
              ? useAppStore.getState().getAssignmentsByPlanId(currentPlanId).filter(a => a.stationId === selectedStationId)
              : [];
            
            return (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">站点信息</h4>
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <p><span className="text-gray-500">站点名称：</span>{station?.name}</p>
                    <p><span className="text-gray-500">详细地址：</span>{station?.address}</p>
                    <p><span className="text-gray-500">坐标位置：</span>{station?.latitude}, {station?.longitude}</p>
                    <p><span className="text-gray-500">设计容量：</span>{station?.capacity} 人</p>
                    <p><span className="text-gray-500">站点状态：</span>{station?.status === 'candidate' ? '候选站点' : '已关闭'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">已分配员工 ({assignments.length}人)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {assignments.map((assignment) => {
                      const employee = useAppStore.getState().employees.find(e => e.id === assignment.employeeId);
                      return (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
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
                            <p className="text-sm text-gray-600">{assignment.distance.toFixed(2)} km</p>
                            <p className="text-xs text-gray-400">顺序 #{assignment.routeOrder}</p>
                          </div>
                        </div>
                      );
                    })}
                    {assignments.length === 0 && (
                      <p className="text-gray-400 text-center py-8">暂无分配员工</p>
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
              {editingStation ? '编辑站点' : '新增站点'}
            </Dialog.Title>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">站点名称</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细地址</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">站点容量（人）</label>
                <input
                  type="number"
                  value={formData.capacity || 20}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status || 'candidate'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'candidate' | 'closed' })}
                  className="input-field"
                >
                  <option value="candidate">候选站点</option>
                  <option value="closed">已关闭</option>
                </select>
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
