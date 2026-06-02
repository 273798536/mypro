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

interface FormErrors {
  name?: string;
  turns?: string;
  crossSection?: string;
  resistance?: string;
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

const validateForm = (data: CoilFormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.name.trim()) {
    errors.name = '请输入线圈名称';
  }

  if (!data.turns || data.turns <= 0) {
    errors.turns = '匝数必须大于 0';
  } else if (!Number.isInteger(data.turns)) {
    errors.turns = '匝数必须是整数';
  } else if (data.turns < 10) {
    errors.turns = '匝数建议不小于 10 匝，否则测量精度会受影响';
  } else if (data.turns > 100000) {
    errors.turns = '匝数不能超过 100000';
  }

  if (!data.crossSection || data.crossSection <= 0) {
    errors.crossSection = '截面积必须大于 0';
  } else if (data.crossSection > 10000) {
    errors.crossSection = '截面积值过大，请检查单位是否正确';
  }

  if (data.resistance < 0) {
    errors.resistance = '电阻不能为负数';
  }

  return errors;
};

export default function CoilsPage() {
  const { coils, addCoil, updateCoil, deleteCoil } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CoilFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setFormErrors({});
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
    setFormErrors({});
    setEditingId(coil.id);
    setShowModal(true);
  };

  const handleNumberInput = (
    field: 'turns' | 'crossSection' | 'resistance',
    value: string,
    requireInteger: boolean = false
  ) => {
    if (value === '' || value === '-') {
      setFormData({ ...formData, [field]: 0 });
      setFormErrors({ ...formErrors, [field]: '请输入有效数值' });
      return;
    }

    const numValue = requireInteger ? parseInt(value, 10) : parseFloat(value);

    if (isNaN(numValue)) {
      return;
    }

    setFormData({ ...formData, [field]: numValue });

    const newErrors = validateForm({ ...formData, [field]: numValue });
    setFormErrors(newErrors);
  };

  const handleSubmit = () => {
    const errors = validateForm(formData);
    setFormErrors(errors);

    const hasCriticalErrors = Object.entries(errors).some(([key, msg]) => {
      if (key === 'turns' && msg?.includes('建议')) return false;
      return !!msg;
    });

    if (hasCriticalErrors) {
      return;
    }

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
                    <td className="table-cell">
                      <span className={`font-mono ${
                        !coil.turns || coil.turns <= 0 ? 'text-accent-error' :
                        coil.turns < 10 ? 'text-accent-warning' : ''
                      }`}>
                        {coil.turns}
                        {(!coil.turns || coil.turns <= 0) && (
                          <span className="ml-1 text-xs">（无效）</span>
                        )}
                        {coil.turns > 0 && coil.turns < 10 && (
                          <span className="ml-1 text-xs">（过低）</span>
                        )}
                      </span>
                    </td>
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
                <label className="label">线圈名称 <span className="text-accent-error">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: undefined });
                    }
                  }}
                  className={`input ${formErrors.name ? 'border-accent-error focus:border-accent-error' : ''}`}
                  placeholder="输入线圈名称"
                />
                {formErrors.name && (
                  <p className="text-xs text-accent-error mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">匝数 <span className="text-accent-error">*</span></label>
                  <input
                    type="number"
                    value={formData.turns || ''}
                    onChange={e => handleNumberInput('turns', e.target.value, true)}
                    className={`input ${formErrors.turns ? 'border-accent-error focus:border-accent-error' : ''}`}
                    min="1"
                    step="1"
                    placeholder="请输入匝数"
                  />
                  {formErrors.turns && (
                    <p className={`text-xs mt-1 ${
                      formErrors.turns.includes('建议') ? 'text-accent-warning' : 'text-accent-error'
                    }`}>
                      {formErrors.turns}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">材质</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={e => setFormData({ ...formData, material: e.target.value })}
                    className="input"
                    placeholder="铜线、漆包线等"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">截面积 <span className="text-accent-error">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.crossSection || ''}
                      onChange={e => handleNumberInput('crossSection', e.target.value)}
                      className={`input flex-1 ${formErrors.crossSection ? 'border-accent-error focus:border-accent-error' : ''}`}
                      min="0.01"
                      placeholder="0.00"
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
                  {formErrors.crossSection && (
                    <p className="text-xs text-accent-error mt-1">{formErrors.crossSection}</p>
                  )}
                </div>
                <div>
                  <label className="label">电阻</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.resistance || ''}
                      onChange={e => handleNumberInput('resistance', e.target.value)}
                      className={`input flex-1 ${formErrors.resistance ? 'border-accent-error focus:border-accent-error' : ''}`}
                      min="0"
                      placeholder="0.00"
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
                  {formErrors.resistance && (
                    <p className="text-xs text-accent-error mt-1">{formErrors.resistance}</p>
                  )}
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
                disabled={
                  !formData.name.trim() ||
                  !formData.turns ||
                  formData.turns <= 0 ||
                  !formData.crossSection ||
                  formData.crossSection <= 0 ||
                  formData.resistance < 0
                }
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
