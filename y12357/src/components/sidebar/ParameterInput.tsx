import { useState, useRef } from 'react';
import { Settings, Upload, Plus, AlertCircle, CheckCircle, FileJson, FileSpreadsheet } from 'lucide-react';
import type { Flywheel, AngularVelocityRecord } from '../../types';
import { useAppStore, useFlywheelErrors } from '../../store/useAppStore';
import { suggestFrictionCoefficient } from '../../engine/frictionCorrector';
import { Modal } from '../common/Modal';
import { parseVelocityFile } from '../../utils/fileParser';

interface ParameterInputProps {
  flywheel: Flywheel | null;
}

interface ImportState {
  isImporting: boolean;
  isAdding: boolean;
  importResult: { success: boolean; message: string } | null;
  addResult: { success: boolean; message: string } | null;
}

interface AddRecordForm {
  timestamp: string;
  omega: string;
  alpha: string;
  torque: string;
}

const initialAddForm: AddRecordForm = {
  timestamp: '',
  omega: '',
  alpha: '',
  torque: '',
};

export function ParameterInput({ flywheel }: ParameterInputProps) {
  const {
    flywheels,
    selectedFlywheelId,
    setSelectedFlywheel,
    updateFlywheel,
    importAngularVelocities,
    addAngularVelocityRecord,
  } = useAppStore();

  const { unitErrors, frictionOmissions } = useFlywheelErrors(flywheel?.id);

  const [radiusValue, setRadiusValue] = useState(flywheel?.rawRadiusInput || '');
  const [radiusUnit, setRadiusUnit] = useState<'mm' | 'cm' | 'm'>(flywheel?.radiusUnit || 'm');
  const [massValue, setMassValue] = useState(flywheel?.mass.toString() || '');
  const [frictionValue, setFrictionValue] = useState(flywheel?.frictionCoeff?.toString() || '');
  const [materialValue, setMaterialValue] = useState(flywheel?.material || '');

  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    isImporting: false,
    isAdding: false,
    importResult: null,
    addResult: null,
  });
  const [addForm, setAddForm] = useState<AddRecordForm>(initialAddForm);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRadiusError = unitErrors.some(e => e.field === 'radius');
  const hasFrictionOmission = frictionOmissions.length > 0;

  const handleRadiusChange = (value: string) => {
    setRadiusValue(value);
    if (flywheel) {
      const updated: Flywheel = {
        ...flywheel,
        rawRadiusInput: value,
        radiusUnit,
      };
      updateFlywheel(updated);
    }
  };

  const handleUnitChange = (unit: 'mm' | 'cm' | 'm') => {
    setRadiusUnit(unit);
    if (flywheel && radiusValue) {
      const numValue = parseFloat(radiusValue);
      if (!isNaN(numValue)) {
        const updated: Flywheel = {
          ...flywheel,
          radiusUnit: unit,
        };
        updateFlywheel(updated);
      }
    }
  };

  const handleMassChange = (value: string) => {
    setMassValue(value);
    if (flywheel) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const updated: Flywheel = {
          ...flywheel,
          mass: numValue,
        };
        updateFlywheel(updated);
      }
    }
  };

  const handleFrictionChange = (value: string) => {
    setFrictionValue(value);
    if (flywheel) {
      const numValue = parseFloat(value);
      const updated: Flywheel = {
        ...flywheel,
        frictionCoeff: value === '' ? null : (isNaN(numValue) ? null : numValue),
      };
      updateFlywheel(updated);
    }
  };

  const handleMaterialChange = (value: string) => {
    setMaterialValue(value);
    if (flywheel) {
      const updated: Flywheel = {
        ...flywheel,
        material: value,
      };
      updateFlywheel(updated);

      if (value && (!frictionValue || parseFloat(frictionValue) === 0)) {
        const suggested = suggestFrictionCoefficient(value);
        setFrictionValue(suggested.toString());
      }
    }
  };

  const handleFlywheelSelect = (id: string) => {
    const selected = flywheels.find(f => f.id === id);
    if (selected) {
      setSelectedFlywheel(id);
      setRadiusValue(selected.rawRadiusInput);
      setRadiusUnit(selected.radiusUnit);
      setMassValue(selected.mass.toString());
      setFrictionValue(selected.frictionCoeff?.toString() || '');
      setMaterialValue(selected.material);
    }
  };

  const handleImportClick = () => {
    setImportState({
      isImporting: false,
      isAdding: false,
      importResult: null,
      addResult: null,
    });
    setSelectedFileName('');
    setShowImportModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setImportState(prev => ({ ...prev, importResult: null }));
    }
  };

  const handleImportConfirm = async () => {
      if (!flywheel || !fileInputRef.current?.files?.[0]) {
        setImportState(prev => ({
          ...prev,
          importResult: { success: false, message: '请先选择文件' },
        }));
        return;
      }

      setImportState(prev => ({ ...prev, isImporting: true, importResult: null }));

      try {
        const result = await parseVelocityFile(fileInputRef.current.files[0], flywheel.id);

        if (result.success && result.records.length > 0) {
          importAngularVelocities(result.records);
          setImportState(prev => ({
            ...prev,
            isImporting: false,
            importResult: {
              success: true,
              message: `成功导入 ${result.records.length} 条记录`,
            },
          }));
          setTimeout(() => {
            setShowImportModal(false);
          }, 1500);
        } else {
          setImportState(prev => ({
            ...prev,
            isImporting: false,
            importResult: {
              success: false,
              message: result.errors.join('；'),
            },
          }));
        }
      } catch (error) {
        setImportState(prev => ({
          ...prev,
          isImporting: false,
          importResult: {
            success: false,
            message: `导入失败: ${(error as Error).message}`,
          },
        }));
      }
    };

  const handleAddClick = () => {
    setAddForm(initialAddForm);
    setImportState(prev => ({
      ...prev,
      addResult: null,
    }));
    setShowAddModal(true);
  };

  const handleAddFormChange = (field: keyof AddRecordForm, value: string) => {
    setAddForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddConfirm = () => {
      if (!flywheel) return;

      const timestamp = parseFloat(addForm.timestamp);
      const omega = parseFloat(addForm.omega);
      const alpha = parseFloat(addForm.alpha || '0');
      const torque = parseFloat(addForm.torque || '0');

      const errors: string[] = [];
      if (isNaN(timestamp) || timestamp < 0) {
        errors.push('时间戳必须是非负数');
      }
      if (isNaN(omega)) {
        errors.push('角速度不能为空');
      }

      if (errors.length > 0) {
        setImportState(prev => ({
          ...prev,
          addResult: { success: false, message: errors.join('；') },
        }));
        return;
      }

      const newRecord: AngularVelocityRecord = {
        id: `vel-manual-${Date.now()}`,
        flywheelId: flywheel.id,
        timestamp: parseFloat(timestamp.toFixed(2)),
        omega: parseFloat(omega.toFixed(4)),
        alpha: isNaN(alpha) ? 0 : parseFloat(alpha.toFixed(4)),
        torque: isNaN(torque) ? 0 : parseFloat(torque.toFixed(2)),
        source: 'manual',
        isValid: true,
      };

      try {
        addAngularVelocityRecord(newRecord);
        setImportState(prev => ({
          ...prev,
          addResult: { success: true, message: '记录添加成功' },
        }));
        setTimeout(() => {
          setShowAddModal(false);
        }, 1500);
      } catch (error) {
        setImportState(prev => ({
          ...prev,
          addResult: {
            success: false,
            message: `添加失败: ${(error as Error).message}`,
          },
        }));
      }
    };

  if (!flywheel) {
    return (
      <div className="industrial-card p-4">
        <div className="section-title flex items-center gap-2">
          <Settings size={14} />
          参数设置
        </div>
        <p className="text-industrial-500 text-sm">请选择一个飞轮</p>
      </div>
    );
  }

  return (
    <>
      <div className={`industrial-card p-4 ${hasFrictionOmission ? 'animate-border-pulse' : ''}`}>
        <div className="section-title flex items-center gap-2">
          <Settings size={14} />
          参数设置
        </div>

        <div className="mb-4">
          <label className="data-label block mb-1">飞轮选择</label>
          <select
            value={selectedFlywheelId || ''}
            onChange={(e) => handleFlywheelSelect(e.target.value)}
            className="industrial-input w-full"
          >
            {flywheels.map(fw => (
              <option key={fw.id} value={fw.id}>
                {fw.name} ({fw.batchNo})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="data-label block mb-1">材料</label>
            <input
              type="text"
              value={materialValue}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className="industrial-input w-full"
              placeholder="45号钢"
            />
          </div>
          <div>
            <label className="data-label block mb-1">批次号</label>
            <input
              type="text"
              value={flywheel.batchNo}
              disabled
              className="industrial-input w-full bg-industrial-900/50 text-industrial-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="data-label block mb-1">飞轮半径</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={radiusValue}
              onChange={(e) => handleRadiusChange(e.target.value)}
              className={`industrial-input flex-1 ${hasRadiusError ? 'industrial-input-error' : ''}`}
              placeholder="输入半径"
            />
            <select
              value={radiusUnit}
              onChange={(e) => handleUnitChange(e.target.value as 'mm' | 'cm' | 'm')}
              className="industrial-input w-20"
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
            </select>
          </div>
          <div className="flex justify-between mt-1">
            <span className="data-label">换算值: {flywheel.radius.toFixed(4)} m</span>
            {hasRadiusError && (
              <span className="text-xs text-alert-red">单位不一致</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="data-label block mb-1">质量 (kg)</label>
            <input
              type="number"
              value={massValue}
              onChange={(e) => handleMassChange(e.target.value)}
              className="industrial-input w-full"
              placeholder="120"
              step="0.1"
            />
          </div>
          <div>
            <label className="data-label block mb-1">摩擦系数</label>
            <input
              type="number"
              value={frictionValue}
              onChange={(e) => handleFrictionChange(e.target.value)}
              className={`industrial-input w-full ${hasFrictionOmission ? 'industrial-input-error' : ''}`}
              placeholder="0.025"
              step="0.001"
            />
          </div>
        </div>

        {hasFrictionOmission && (
          <div className="error-alert text-xs mb-4">
            {frictionOmissions.map(o => (
              <div key={o.id}>
              【摩擦修正遗漏】{o.batchNo}批次{o.materialName}摩擦系数未配置，
              建议配置标准值 {suggestFrictionCoefficient(o.materialName)}
              <button
                onClick={() => {
                  const suggested = suggestFrictionCoefficient(o.materialName);
                  setFrictionValue(suggested.toString());
                  handleFrictionChange(suggested.toString());
                }}
                className="ml-2 underline hover:text-white"
              >
                一键填充
              </button>
            </div>
          ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleImportClick}
            className="industrial-btn flex-1 flex items-center justify-center gap-1.5"
          >
            <Upload size={14} />
            导入角速度
          </button>
          <button
            onClick={handleAddClick}
            className="industrial-btn flex-1 flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            添加记录
          </button>
        </div>
      </div>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="导入角速度记录"
      >
        <div className="space-y-4">
          <div className="industrial-card p-4 bg-industrial-900/50">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1">
                <FileJson size={24} className="text-tech-400" />
                <FileSpreadsheet size={24} className="text-alert-green" />
              </div>
              <div className="flex-1">
                <div className="data-label mb-1">支持格式</div>
                <div className="text-xs text-industrial-400">
                  <div>• JSON: [{'"timestamp": 0, "omega": 100, "alpha": 5, "torque": 50}]</div>
                  <div>• CSV: timestamp,omega,alpha,torque</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="data-label block mb-2">选择文件</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="industrial-card p-4 border-dashed cursor-pointer hover:border-tech-500/50 hover:bg-tech-500/5 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFileName ? (
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-alert-green" />
                  <span className="text-sm">{selectedFileName}</span>
                </div>
              ) : (
                <div className="text-center text-industrial-500 text-sm">
                  点击选择文件或拖拽到此处
                </div>
              )}
            </div>
          </div>

          {importState.importResult && (
            <div
              className={`text-sm p-3 rounded-sm ${
                importState.importResult.success
                  ? 'bg-green-950/60 border border-alert-green text-green-200'
                  : 'bg-red-950/60 border border-alert-red text-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {importState.importResult.success ? (
                  <CheckCircle size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                )}
                <span>{importState.importResult.message}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowImportModal(false)}
              className="industrial-btn flex-1"
            >
              取消
            </button>
            <button
              onClick={handleImportConfirm}
              disabled={importState.isImporting || !selectedFileName}
              className="industrial-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importState.isImporting ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="手动添加角速度记录"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="data-label block mb-1">
                时间戳 <span className="text-alert-red">*</span>
              </label>
              <input
                type="number"
                value={addForm.timestamp}
                onChange={(e) => handleAddFormChange('timestamp', e.target.value)}
                className="industrial-input w-full"
                placeholder="0.0"
                step="0.1"
                min="0"
              />
              <div className="text-xs text-industrial-500 mt-1">单位: 秒</div>
            </div>
            <div>
              <label className="data-label block mb-1">
                角速度 ω <span className="text-alert-red">*</span>
              </label>
              <input
                type="number"
                value={addForm.omega}
                onChange={(e) => handleAddFormChange('omega', e.target.value)}
                className="industrial-input w-full"
                placeholder="100.0"
                step="0.1"
              />
              <div className="text-xs text-industrial-500 mt-1">单位: rad/s</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="data-label block mb-1">角加速度 α</label>
              <input
                type="number"
                value={addForm.alpha}
                onChange={(e) => handleAddFormChange('alpha', e.target.value)}
                className="industrial-input w-full"
                placeholder="5.0"
                step="0.1"
              />
              <div className="text-xs text-industrial-500 mt-1">单位: rad/s²</div>
            </div>
            <div>
              <label className="data-label block mb-1">力矩 τ</label>
              <input
                type="number"
                value={addForm.torque}
                onChange={(e) => handleAddFormChange('torque', e.target.value)}
                className="industrial-input w-full"
                placeholder="50.0"
                step="0.1"
              />
              <div className="text-xs text-industrial-500 mt-1">单位: N·m</div>
            </div>
          </div>

          <div className="industrial-card p-3 bg-industrial-900/50 text-xs text-industrial-400">
            <div className="font-semibold text-industrial-300 mb-1">计算说明</div>
            <div>• 如未填写 α 和 τ，系统将基于邻近记录自动推算</div>
            <div>• 记录将标记为"manual"来源，参与后续惯量计算</div>
          </div>

          {importState.addResult && (
            <div
              className={`text-sm p-3 rounded-sm ${
                importState.addResult.success
                  ? 'bg-green-950/60 border border-alert-green text-green-200'
                  : 'bg-red-950/60 border border-alert-red text-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {importState.addResult.success ? (
                  <CheckCircle size={16} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                )}
                <span>{importState.addResult.message}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="industrial-btn flex-1"
            >
              取消
            </button>
            <button
              onClick={handleAddConfirm}
              disabled={importState.isAdding}
              className="industrial-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importState.isAdding ? '添加中...' : '确认添加'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
