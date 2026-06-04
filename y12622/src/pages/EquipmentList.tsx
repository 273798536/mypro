import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Eye, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DataTable } from '../components/common/DataTable';
import { EquipmentStatusBadge } from '../components/common/StatusBadge';
import type { Equipment } from '../types';

export default function EquipmentList() {
  const navigate = useNavigate();
  const equipment = useAppStore((state) => state.equipment);
  const addEquipment = useAppStore((state) => state.addEquipment);
  const getAnomaliesByEquipment = useAppStore((state) => state.getAnomaliesByEquipment);
  const getImagesByEquipment = useAppStore((state) => state.getImagesByEquipment);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    model: '',
    sn: '',
    location: '',
    status: 'active' as Equipment['status'],
  });

  const filteredEquipment = equipment.filter(
    (eq) =>
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.sn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!newEquipment.name.trim()) return;
    addEquipment(newEquipment);
    setShowAddModal(false);
    setNewEquipment({ name: '', model: '', sn: '', location: '', status: 'active' });
  };

  const columns = [
    {
      key: 'name',
      header: '设备名称',
      render: (row: Equipment) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.model}</p>
        </div>
      ),
    },
    {
      key: 'sn',
      header: '序列号',
      render: (row: Equipment) => (
        <span className="font-mono text-sm text-gray-600">{row.sn}</span>
      ),
    },
    {
      key: 'location',
      header: '位置',
      render: (row: Equipment) => row.location,
    },
    {
      key: 'status',
      header: '状态',
      render: (row: Equipment) => <EquipmentStatusBadge status={row.status} />,
    },
    {
      key: 'images',
      header: '底图数',
      render: (row: Equipment) => getImagesByEquipment(row.id).length,
    },
    {
      key: 'anomalies',
      header: '异常数',
      render: (row: Equipment) => {
        const count = getAnomaliesByEquipment(row.id).length;
        return (
          <span className={count > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
            {count}
          </span>
        );
      },
    },
    {
      key: 'created',
      header: '创建时间',
      render: (row: Equipment) =>
        new Date(row.created_at).toLocaleDateString('zh-CN'),
    },
    {
      key: 'action',
      header: '操作',
      render: (row: Equipment) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/equipment/${row.id}`);
            }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="查看详情"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索设备名称、型号、序列号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          添加设备
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredEquipment}
          onRowClick={(row) => navigate(`/equipment/${row.id}`)}
          emptyMessage="暂无设备，请先添加设备"
        />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-serif">
              添加新设备
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  设备名称 *
                </label>
                <input
                  type="text"
                  value={newEquipment.name}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, name: e.target.value })
                  }
                  placeholder="如：光学显微镜 A-1"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  型号
                </label>
                <input
                  type="text"
                  value={newEquipment.model}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, model: e.target.value })
                  }
                  placeholder="如：Olympus BX53"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  序列号
                </label>
                <input
                  type="text"
                  value={newEquipment.sn}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, sn: e.target.value })
                  }
                  placeholder="如：SN-2024-00156"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  位置
                </label>
                <input
                  type="text"
                  value={newEquipment.location}
                  onChange={(e) =>
                    setNewEquipment({ ...newEquipment, location: e.target.value })
                  }
                  placeholder="如：康复中心实验室 A区"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <select
                  value={newEquipment.status}
                  onChange={(e) =>
                    setNewEquipment({
                      ...newEquipment,
                      status: e.target.value as Equipment['status'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">正常使用</option>
                  <option value="inactive">停用</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
