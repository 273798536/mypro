import { useState } from 'react';
import { useStore } from '@/store';
import { CircuitBoard, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import type { CrossSectionUnit, ResistanceUnit, CoilStatus } from '@/types';

interface CoilFormData {
  name: string;
  turns: number;
  crossSection: number;
  crossSectionUnit: CrossSectionUnit;
  resistance: number;
  resistanceUnit: ResistanceUnit;
  material: string;
  remark: string;
  status: CoilStatus;
}

const initialFormData: CoilFormData = {
  name: '',
  turns: 100,
  crossSection: 1,
  crossSectionUnit: 'cm²',
  resistance: 10,
  resistanceUnit: 'Ω',
  material: '铜线',
  remark: '',
  status: 'normal',
};

export default function CoilsPage() {
  const { coils, addCoil, updateCoil, deleteCoil } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CoilFormData>(initialFormData);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (coil: typeof coils[0]) => {
    setFormData({
      name: coil.name,
      turns: coil.turns,
      crossSection: coil.crossSection,
      crossSectionUnit: coil.crossSectionUnit,
      resistance: coil.resistance,
      resistanceUnit: coil.resistanceUnit,
      material: coil.material,
      remark: coil.remark,
      status: coil.status,
    });
    setEditingId(coil.id);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateCoil(editingId, formData);
    } else {
      addCoil(formData);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个线圈吗？相关的磁场序列和报告也会受到影响。')) {
      deleteCoil(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">线圈参数</h1>
          <p className="text-primary-300 mt-1">管理实验线圈的基础参数</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          新建线圈
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-dark-bg/80">
              <tr>
                <th className="table-header">线圈名称</th>
                <th className="table-header">匝数</th>
                <th className="table-header">截面积</th>
                <th className="table-header">电阻</th>
                <th className="table-header">材质</th>
                <th className="table-header">状态</th>
                <th className="table-header">备注</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {coils.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-primary-400">
                    <CircuitBoard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>暂无线圈参数</p>
                    <p className="text-sm mt-1">点击"新建线圈"添加第一个线圈</p>
                  </td>
                </tr>
              ) : (
                coils.map((coil, index) => (
                  <tr
                    key={coil.id}
                    className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}
                  >
                    <td className="table-cell font-medium text-white">{coil.name}</td>
                    <td className="table-cell font-mono">{coil.turns}</td>
                    <td className="table-cell font-mono">
                      {coil.crossSection} {coil.crossSectionUnit}
                    </td>
                    <td className="table-cell font-mono">
                      {coil.resistance} {coil.resistanceUnit}
                    </td>
                    <td className="table-cell">{coil.material}</td>
                    <td className="table-cell">
                      <span className={
                        coil.status === 'normal' ? 'badge-success' :
                        coil.status === 'invalid' ? 'badge-error' : 'badge-warning'
                      }>
                        {coil.status === 'normal' ? '正常' :
                         coil.status === 'invalid' ? '失效' : '停用'}
                      </span>
                    </td>
                    <td className="table-cell max-w-xs truncate text-primary-300">
                      {coil.remark || '-'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(coil)}
                          className="p-2 rounded-lg hover:bg-primary-600/20 text-primary-300 hover:text-primary-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coil.id)}
                          className="p-2 rounded-lg hover:bg-accent-error/20 text-primary-300 hover:text-accent-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4 animate-slide-up">
            <div className="p-6 border-b border-dark-border/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? '编辑线圈' : '新建线圈'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-border/50 text-primary-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
              <div>
                <label className="label">线圈名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="输入线圈名称"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">匝数</label>
                  <input
                    type="number"
                    value={formData.turns}
                    onChange={e => setFormData({ ...formData, turns: Number(e.target.value) })}
                    className="input"
                    min="1"
                  />
                </div>
                <div>
                  <label className="label">材质</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={e => setFormData({ ...formData, material: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">截面积</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.crossSection}
                      onChange={e => setFormData({ ...formData, crossSection: Number(e.target.value) })}
                      className="input flex-1"
                      min="0.01"
                    />
                    <select
                      value={formData.crossSectionUnit}
                      onChange={e => setFormData({ ...formData, crossSectionUnit: e.target.value as CrossSectionUnit })}
                      className="input w-24"
                    >
                      <option value="m²">m²</option>
                      <option value="cm²">cm²</option>
                      <option value="mm²">mm²</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">电阻</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.resistance}
                      onChange={e => setFormData({ ...formData, resistance: Number(e.target.value) })}
                      className="input flex-1"
                      min="0"
                    />
                    <select
                      value={formData.resistanceUnit}
                      onChange={e => setFormData({ ...formData, resistanceUnit: e.target.value as ResistanceUnit })}
                      className="input w-20"
                    >
                      <option value="Ω">Ω</option>
                      <option value="kΩ">kΩ</option>
                      <option value="mΩ">mΩ</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as CoilStatus })}
                    className="input"
                  >
                    <option value="normal">正常</option>
                    <option value="invalid">失效</option>
                    <option value="deprecated">停用</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={e => setFormData({ ...formData, remark: e.target.value })}
                  className="input resize-none h-20"
                  placeholder="添加备注信息"
                />
              </div>
            </div>

            <div className="p-6 border-t border-dark-border/50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingId ? '保存修改' : '创建线圈'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
