import { useState } from 'react';
import { useAppStore } from '../store';
import { Settings, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import type { Nozzle } from '../types';

const initialFormData = {
  model: '',
  orificeDiameter: 0.8,
  sprayAngle: 110,
  nominalFlowRate: 1.2,
  minPressure: 1.5,
  maxPressure: 6.0,
  manufacturer: ''
};

export function NozzleManagement() {
  const { nozzles, addNozzle, updateNozzle, deleteNozzle } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingNozzle, setEditingNozzle] = useState<Nozzle | null>(null);
  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNozzle) {
      updateNozzle(editingNozzle.id, formData);
    } else {
      addNozzle(formData);
    }
    setShowModal(false);
    setEditingNozzle(null);
    setFormData(initialFormData);
  };

  const handleEdit = (nozzle: Nozzle) => {
    setEditingNozzle(nozzle);
    setFormData({
      model: nozzle.model,
      orificeDiameter: nozzle.orificeDiameter,
      sprayAngle: nozzle.sprayAngle,
      nominalFlowRate: nozzle.nominalFlowRate,
      minPressure: nozzle.minPressure,
      maxPressure: nozzle.maxPressure,
      manufacturer: nozzle.manufacturer
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个喷嘴参数吗？')) {
      deleteNozzle(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">喷嘴参数管理</h1>
          <p className="text-slate-500 mt-1">管理所有喷嘴型号的基础参数</p>
        </div>
        <button
          onClick={() => {
            setEditingNozzle(null);
            setFormData(initialFormData);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          新增喷嘴
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">喷嘴型号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">孔径(mm)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">喷雾角度</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标称流量(L/min)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">工作压力范围(bar)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">制造商</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nozzles.map((nozzle) => (
                <tr key={nozzle.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{nozzle.model}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{nozzle.orificeDiameter}</td>
                  <td className="px-6 py-4 text-slate-600">{nozzle.sprayAngle}°</td>
                  <td className="px-6 py-4 text-slate-600">{nozzle.nominalFlowRate}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600">
                      {nozzle.minPressure} - {nozzle.maxPressure}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{nozzle.manufacturer}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(nozzle)}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(nozzle.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {nozzles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    暂无喷嘴参数数据
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
                {editingNozzle ? '编辑喷嘴参数' : '新增喷嘴'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingNozzle(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">喷嘴型号</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="如: TeeJet XR11002"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">孔径(mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.orificeDiameter}
                    onChange={(e) => setFormData({ ...formData, orificeDiameter: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">喷雾角度(°)</label>
                  <input
                    type="number"
                    value={formData.sprayAngle}
                    onChange={(e) => setFormData({ ...formData, sprayAngle: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">标称流量(L/min)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.nominalFlowRate}
                    onChange={(e) => setFormData({ ...formData, nominalFlowRate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">制造商</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="如: TeeJet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最小压力(bar)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.minPressure}
                    onChange={(e) => setFormData({ ...formData, minPressure: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最大压力(bar)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxPressure}
                    onChange={(e) => setFormData({ ...formData, maxPressure: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingNozzle(null);
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
