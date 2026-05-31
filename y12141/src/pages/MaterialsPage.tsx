import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { FREQUENCY_BANDS } from '@/types';
import type { FrequencyBand, AcousticMaterial } from '@/types';
import { Package, Plus, Trash2, Save, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export const MaterialsPage = () => {
  const { materials, roadNoiseSources, barriers, loadMockData, runValidation, addMaterial, updateMaterial, removeMaterial } =
    useAppStore();

  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AcousticMaterial> | null>(null);

  useEffect(() => {
    if (materials.length === 0) {
      loadMockData();
    }
  }, [materials.length, loadMockData]);

  useEffect(() => {
    runValidation();
  }, [materials, roadNoiseSources, barriers, runValidation]);

  const handleEdit = (material: AcousticMaterial) => {
    setEditingMaterial(material.id);
    setEditForm({
      name: material.name,
      sourceFile: material.sourceFile,
      sourceLine: material.sourceLine,
      transmissionLoss: { ...material.transmissionLoss },
      absorptionCoefficient: { ...material.absorptionCoefficient },
    });
  };

  const handleSave = (id: string) => {
    if (!editForm) return;
    updateMaterial(id, editForm as AcousticMaterial);
    setEditingMaterial(null);
    setEditForm(null);
  };

  const handleCancel = () => {
    setEditingMaterial(null);
    setEditForm(null);
  };

  const handleAddNew = () => {
    const id = `mat-${Date.now()}`;
    const emptySpectrum = FREQUENCY_BANDS.reduce((acc, band) => {
      acc[band] = null;
      return acc;
    }, {} as Record<FrequencyBand, number | null>);

    const newMaterial: AcousticMaterial = {
      id,
      name: '新材料',
      sourceFile: '手动录入',
      sourceLine: 0,
      transmissionLoss: { ...emptySpectrum },
      absorptionCoefficient: { ...emptySpectrum },
    };

    addMaterial(newMaterial);
    setEditingMaterial(id);
    setEditForm(newMaterial);
  };

  const updateEditForm = (field: string, value: unknown) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const updateSpectrumValue = (
    spectrumType: 'transmissionLoss' | 'absorptionCoefficient',
    band: FrequencyBand,
    value: string
  ) => {
    if (!editForm) return;
    const numValue = value === '' ? null : parseFloat(value);
    const spectrum = editForm[spectrumType] as Record<FrequencyBand, number | null>;
    setEditForm({
      ...editForm,
      [spectrumType]: {
        ...spectrum,
        [band]: isNaN(numValue as number) ? null : numValue,
      },
    });
  };

  const getMaterialStatus = (material: AcousticMaterial) => {
    const tlComplete = FREQUENCY_BANDS.every((b) => material.transmissionLoss[b] !== null);
    const acComplete = FREQUENCY_BANDS.every((b) => material.absorptionCoefficient[b] !== null);
    if (tlComplete && acComplete) return 'complete';
    if (tlComplete || acComplete) return 'partial';
    return 'incomplete';
  };

  return (
    <div className="min-h-screen bg-primary-950 pl-64">
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-white mb-2">材料管理</h1>
            <p className="text-primary-400">
              管理隔音材料的声学参数，确保频段数据完整对齐
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange text-white hover:bg-accent-orange/90 transition-all text-sm"
          >
            <Plus size={16} />
            添加新材料
          </button>
        </div>

        <div className="space-y-6">
          {materials.map((material) => {
            const isEditing = editingMaterial === material.id;
            const status = getMaterialStatus(material);
            const displayData = isEditing && editForm ? editForm : material;

            return (
              <div
                key={material.id}
                className={`bg-primary-900/80 border rounded-xl p-6 transition-all ${
                  status === 'complete'
                    ? 'border-accent-green/30'
                    : status === 'partial'
                    ? 'border-accent-orange/30'
                    : 'border-accent-red/30'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        status === 'complete'
                          ? 'bg-accent-green/20'
                          : status === 'partial'
                          ? 'bg-accent-orange/20'
                          : 'bg-accent-red/20'
                      }`}
                    >
                      <Package
                        size={24}
                        className={
                          status === 'complete'
                            ? 'text-accent-green'
                            : status === 'partial'
                            ? 'text-accent-orange'
                            : 'text-accent-red'
                        }
                      />
                    </div>
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm?.name || ''}
                          onChange={(e) => updateEditForm('name', e.target.value)}
                          className="bg-primary-800 border border-primary-600 rounded-lg px-3 py-1.5 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-accent-orange/50"
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-white">{material.name}</h3>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        {material.sourceFile && (
                          <span className="flex items-center gap-1 text-primary-400">
                            <FileText size={12} />
                            {material.sourceFile}
                            {material.sourceLine ? ` · 第${material.sourceLine}行` : ''}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            status === 'complete'
                              ? 'bg-accent-green/20 text-accent-green'
                              : status === 'partial'
                              ? 'bg-accent-orange/20 text-accent-orange'
                              : 'bg-accent-red/20 text-accent-red'
                          }`}
                        >
                          {status === 'complete' ? (
                            <>
                              <CheckCircle size={12} /> 数据完整
                            </>
                          ) : (
                            <>
                              <AlertCircle size={12} />
                              {status === 'partial' ? '部分缺失' : '数据缺失'}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSave(material.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green text-white text-sm hover:bg-accent-green/90 transition-all"
                        >
                          <Save size={14} />
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1.5 rounded-lg bg-primary-700 text-primary-300 text-sm hover:bg-primary-600 transition-all"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(material)}
                          className="px-3 py-1.5 rounded-lg bg-primary-700 text-primary-300 text-sm hover:bg-primary-600 transition-all"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => removeMaterial(material.id)}
                          className="p-1.5 rounded-lg bg-accent-red/20 text-accent-red hover:bg-accent-red/30 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-primary-300 mb-3 flex items-center gap-2">
                      隔声量 [dB]
                      <span className="text-xs text-primary-500 font-normal">
                        声音透过材料的衰减量
                      </span>
                    </h4>
                    <div className="grid grid-cols-8 gap-2">
                      {FREQUENCY_BANDS.map((band) => {
                        const value = (displayData.transmissionLoss as Record<FrequencyBand, number | null>)[band];
                        const hasError = value === null;
                        return (
                          <div key={band} className="space-y-1">
                            <div className="text-[10px] text-primary-500 text-center font-mono">
                              {band}Hz
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                value={value === null ? '' : value}
                                onChange={(e) =>
                                  updateSpectrumValue('transmissionLoss', band, e.target.value)
                                }
                                placeholder="—"
                                className={`w-full px-2 py-2 rounded-lg text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange/50 ${
                                  hasError
                                    ? 'bg-accent-red/10 border border-accent-red/40 text-accent-red placeholder-accent-red/50'
                                    : 'bg-primary-800 border border-primary-600 text-white'
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-full px-2 py-2 rounded-lg text-center font-mono text-sm ${
                                  hasError
                                    ? 'bg-accent-red/10 border border-accent-red/40 text-accent-red'
                                    : 'bg-primary-800/50 border border-primary-700 text-white'
                                }`}
                              >
                                {value === null ? '—' : value}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-primary-300 mb-3 flex items-center gap-2">
                      吸声系数
                      <span className="text-xs text-primary-500 font-normal">
                        材料吸收的声能比例 (0-1)
                      </span>
                    </h4>
                    <div className="grid grid-cols-8 gap-2">
                      {FREQUENCY_BANDS.map((band) => {
                        const value = (displayData.absorptionCoefficient as Record<FrequencyBand, number | null>)[band];
                        const hasError = value === null;
                        return (
                          <div key={band} className="space-y-1">
                            <div className="text-[10px] text-primary-500 text-center font-mono">
                              {band}Hz
                            </div>
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={value === null ? '' : value}
                                onChange={(e) =>
                                  updateSpectrumValue('absorptionCoefficient', band, e.target.value)
                                }
                                placeholder="—"
                                className={`w-full px-2 py-2 rounded-lg text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange/50 ${
                                  hasError
                                    ? 'bg-accent-orange/10 border border-accent-orange/40 text-accent-orange placeholder-accent-orange/50'
                                    : 'bg-primary-800 border border-primary-600 text-white'
                                }`}
                              />
                            ) : (
                              <div
                                className={`w-full px-2 py-2 rounded-lg text-center font-mono text-sm ${
                                  hasError
                                    ? 'bg-accent-orange/10 border border-accent-orange/40 text-accent-orange'
                                    : 'bg-primary-800/50 border border-primary-700 text-white'
                                }`}
                              >
                                {value === null ? '—' : value}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-primary-800/30 border border-primary-700 rounded-xl">
          <h4 className="text-sm font-medium text-white mb-2">数据对齐说明</h4>
          <p className="text-sm text-primary-400">
            材料参数必须与道路噪声源的8个频段（63Hz~8kHz）一一对应。隔声量缺失将导致该频段无法计算，
            吸声系数缺失仅影响计算精度。数据来源文件和行号用于问题溯源，请确保录入准确。
          </p>
        </div>
      </div>
    </div>
  );
};
