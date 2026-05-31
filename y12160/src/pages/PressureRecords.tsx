import { useState } from 'react';
import { useAppStore } from '../store';
import { Gauge, Plus, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { PressureRecord } from '../types';

const initialFormData = {
  nozzleId: '',
  pressure: 3.0,
  recordTime: new Date().toISOString().slice(0, 16),
  operator: '',
  location: '',
  remarks: ''
};

export function PressureRecords() {
  const { nozzles, pressureRecords, addPressureRecord, updatePressureRecord, deletePressureRecord } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PressureRecord | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const getNozzleById = (id: string) => nozzles.find(n => n.id === id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      updatePressureRecord(editingRecord.id, formData);
    } else {
      addPressureRecord(formData);
    }
    setShowModal(false);
    setEditingRecord(null);
    setFormData(initialFormData);
  };

  const handleEdit = (record: PressureRecord) => {
    setEditingRecord(record);
    setFormData({
      nozzleId: record.nozzleId,
      pressure: record.pressure,
      recordTime: record.recordTime.slice(0, 16),
      operator: record.operator,
      location: record.location,
      remarks: record.remarks
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条压力记录吗？')) {
      deletePressureRecord(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">压力记录管理</h1>
          <p className="text-slate-500 mt-1">管理所有喷嘴的压力测试记录</p>
        </div>
        <button
          onClick={() => {
            setEditingRecord(null);
            setFormData(initialFormData);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          新增记录
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">喷嘴型号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">压力值(bar)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">记录时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">操作人员</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">作业地点</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pressureRecords.map((record) => {
                const nozzle = getNozzleById(record.nozzleId);
                return (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{nozzle?.model || '未知喷嘴'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${record.isOutOfRange ? 'text-orange-600' : 'text-slate-900'}`}>
                        {record.pressure.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {record.isOutOfRange ? (
                        <StatusBadge type="warning">
                          越界
                        </StatusBadge>
                      ) : (
                        <StatusBadge type="success">
                          正常
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(record.recordTime).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{record.operator}</td>
                    <td className="px-6 py-4 text-slate-600">{record.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pressureRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    暂无压力记录数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingRecord ? '编辑压力记录' : '新增压力记录'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRecord(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">选择喷嘴</label>
                <select
                  value={formData.nozzleId}
                  onChange={(e) => setFormData({ ...formData, nozzleId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">请选择喷嘴型号</option>
                  {nozzles.map((nozzle) => (
                    <option key={nozzle.id} value={nozzle.id}>
                      {nozzle.model} (压力范围: {nozzle.minPressure}-{nozzle.maxPressure} bar)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">压力值(bar)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.pressure}
                    onChange={(e) => setFormData({ ...formData, pressure: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                  {formData.nozzleId && (() => {
                    const nozzle = getNozzleById(formData.nozzleId);
                    if (nozzle && (formData.pressure < nozzle.minPressure || formData.pressure > nozzle.maxPressure)) {
                      return (
                        <p className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          压力超出喷嘴工作范围 ({nozzle.minPressure}-{nozzle.maxPressure} bar)
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">记录时间</label>
                  <input
                    type="datetime-local"
                    value={formData.recordTime}
                    onChange={(e) => setFormData({ ...formData, recordTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">操作人员</label>
                  <input
                    type="text"
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="如: 张工"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">作业地点</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="如: A区麦田"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  rows={2}
                  placeholder="可选备注信息"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={16} />
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
