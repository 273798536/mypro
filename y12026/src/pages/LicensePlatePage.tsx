import { useState, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, History, Car, Building2, Phone, Clock, AlertTriangle } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import type { LicensePlate } from '@/types';

export function LicensePlatePage() {
  const { licensePlates, addLicensePlate, updateLicensePlate, monthlyCards } = useDataStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingPlate, setEditingPlate] = useState<LicensePlate | null>(null);
  const [selectedPlate, setSelectedPlate] = useState<LicensePlate | null>(null);
  const [formData, setFormData] = useState<{
    plateNumber: string;
    ownerName: string;
    ownerId: string;
    building: string;
    roomNumber: string;
    phone: string;
    status: 'active' | 'inactive' | 'transferred';
    remarks: string;
  }>({
    plateNumber: '',
    ownerName: '',
    ownerId: '',
    building: '',
    roomNumber: '',
    phone: '',
    status: 'active',
    remarks: '',
  });

  const buildings = useMemo(() => {
    const uniqueBuildings = [...new Set(licensePlates.map(p => p.building))];
    return uniqueBuildings.filter(Boolean).sort();
  }, [licensePlates]);

  const filteredPlates = useMemo(() => {
    return licensePlates.filter(plate => {
      const matchesSearch = !searchTerm || 
        plate.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plate.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plate.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBuilding = !buildingFilter || plate.building === buildingFilter;
      const matchesStatus = statusFilter === 'all' || plate.status === statusFilter;
      return matchesSearch && matchesBuilding && matchesStatus;
    });
  }, [licensePlates, searchTerm, buildingFilter, statusFilter]);

  const platesWithCardInfo = useMemo(() => {
    return filteredPlates.map(plate => {
      const card = monthlyCards.find(c => c.plateId === plate.id);
      return { ...plate, monthlyCard: card };
    });
  }, [filteredPlates, monthlyCards]);

  const handleOpenModal = (plate?: LicensePlate) => {
    if (plate) {
      setEditingPlate(plate);
      setFormData({
        plateNumber: plate.plateNumber,
        ownerName: plate.ownerName,
        ownerId: plate.ownerId,
        building: plate.building,
        roomNumber: plate.roomNumber,
        phone: plate.phone,
        status: plate.status as 'active' | 'inactive' | 'transferred',
        remarks: plate.remarks || '',
      });
    } else {
      setEditingPlate(null);
      setFormData({
        plateNumber: '',
        ownerName: '',
        ownerId: '',
        building: '',
        roomNumber: '',
        phone: '',
        status: 'active',
        remarks: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.plateNumber || !formData.ownerName) return;

    if (editingPlate) {
      updateLicensePlate(editingPlate.id, {
        ...formData,
      });
    } else {
      addLicensePlate({
        ...formData,
        bindingHistory: [],
      });
    }
    setIsModalOpen(false);
  };

  const handleViewHistory = (plate: LicensePlate) => {
    setSelectedPlate(plate);
    setIsHistoryModalOpen(true);
  };

  const hasTransferredHistory = (plate: LicensePlate) => {
    return plate.bindingHistory && plate.bindingHistory.length > 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">车牌档案管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理小区车辆登记信息，支持车牌换绑历史追溯</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          新增车辆
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索车牌号、业主姓名、房号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部楼栋</option>
              {buildings.map(b => (
                <option key={b} value={b}>{b}栋</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="inactive">停用</option>
              <option value="transferred">已过户</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {platesWithCardInfo.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">车牌信息</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">业主信息</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">月卡状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">档案状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {platesWithCardInfo.map((plate) => (
                  <tr key={plate.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          hasTransferredHistory(plate) ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <Car size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{plate.plateNumber}</div>
                          {hasTransferredHistory(plate) && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                              <AlertTriangle size={12} />
                              <span>存在换绑记录</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-slate-900">{plate.ownerName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Building2 size={14} />
                          <span>{plate.building}栋 {plate.roomNumber}室</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Phone size={14} />
                          <span>{plate.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {plate.monthlyCard ? (
                        <div className="space-y-1">
                          <StatusBadge status={plate.monthlyCard.status} />
                          <div className="text-xs text-slate-500">
                            <div>类型: {plate.monthlyCard.cardType === 'standard' ? '标准' : plate.monthlyCard.cardType === 'vip' ? 'VIP' : '员工'}</div>
                            <div>到期: {plate.monthlyCard.expiryDate}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">未办理</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={plate.status} />
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                        <Clock size={12} />
                        <span>{plate.updatedAt.slice(0, 10)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(plate)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleViewHistory(plate)}
                          className={`p-2 rounded-lg transition-colors ${
                            hasTransferredHistory(plate) 
                              ? 'text-amber-600 hover:bg-amber-50' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title="换绑历史"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Car size={48} />}
              title="暂无车牌档案"
              description="点击「新增车辆」添加第一条车牌信息"
            />
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>共 {filteredPlates.length} 条记录</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                正常: {licensePlates.filter(p => p.status === 'active').length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                已过户: {licensePlates.filter(p => p.status === 'transferred').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlate ? '编辑车牌档案' : '新增车辆登记'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">车牌号 *</label>
              <input
                type="text"
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                placeholder="如：粤A12345"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">业主姓名 *</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">楼栋</label>
              <input
                type="text"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                placeholder="如：1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">房号</label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="如：101"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">联系电话</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">档案状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'transferred' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">正常</option>
                <option value="inactive">停用</option>
                <option value="transferred">已过户</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingPlate ? '保存修改' : '确认登记'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="车牌换绑历史"
      >
        {selectedPlate && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Car className="text-blue-600" size={24} />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{selectedPlate.plateNumber}</div>
                  <div className="text-sm text-slate-500">当前车主: {selectedPlate.ownerName}</div>
                </div>
              </div>
            </div>

            {selectedPlate.bindingHistory && selectedPlate.bindingHistory.length > 0 ? (
              <div className="space-y-3">
                {selectedPlate.bindingHistory.map((binding, index) => (
                  <div key={binding.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-600' : 'bg-slate-300'
                      }`}></div>
                      {index < selectedPlate.bindingHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{binding.ownerName}</span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">当前</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        绑定日期: {binding.bindingDate}
                        {binding.unbindingDate && ` → 解绑日期: ${binding.unbindingDate}`}
                      </div>
                      {binding.reason && (
                        <div className="text-sm text-slate-600 mt-1">原因: {binding.reason}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                暂无换绑历史记录
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
