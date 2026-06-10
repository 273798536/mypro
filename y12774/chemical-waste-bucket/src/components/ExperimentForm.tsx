import { useState } from 'react';
import type { ExperimentRecord, Reagent, BalanceCalculation, SpectrumData } from '../types';
import { WASTE_CATEGORIES, BUCKET_NUMBERS } from '../data/sampleData';
import { validateReagentConcentration, getValidationErrors } from '../utils/validation';
import { Plus, Trash2, AlertTriangle, CheckCircle, XCircle, FlaskConical, Calculator, BarChart3 } from 'lucide-react';

interface Props {
  onSubmit: (record: ExperimentRecord) => void;
  onCancel: () => void;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ExperimentForm({ onSubmit, onCancel }: Props) {
  const now = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Omit<ExperimentRecord, 'id' | 'createdAt' | 'updatedAt' | 'hasAbnormalities' | 'abnormalitySummary'>>({
    experimentName: '',
    experimentDate: now,
    experimenter: '',
    courseName: '',
    wasteCategory: '有机废液',
    bucketNumber: 'ORG-001',
    reagents: [{
      id: generateId('r'),
      name: '',
      formula: '',
      concentration: 0,
      concentrationUnit: 'mol/L',
      volume: 0,
      volumeUnit: 'mL',
      hazardLevel: '低毒',
    }],
    manualNotes: '',
    spectrumData: [],
    balanceCalculations: [],
    status: '草稿',
  });

  const [showValidation, setShowValidation] = useState(false);

  const updateReagent = (idx: number, field: keyof Reagent, value: string | number) => {
    const newReagents = [...formData.reagents];
    (newReagents[idx] as any)[field] = value;
    setFormData({ ...formData, reagents: newReagents });
  };

  const addReagent = () => {
    setFormData({
      ...formData,
      reagents: [...formData.reagents, {
        id: generateId('r'),
        name: '',
        formula: '',
        concentration: 0,
        concentrationUnit: 'mol/L',
        volume: 0,
        volumeUnit: 'mL',
        hazardLevel: '低毒',
      }]
    });
  };

  const removeReagent = (idx: number) => {
    if (formData.reagents.length <= 1) return;
    setFormData({
      ...formData,
      reagents: formData.reagents.filter((_, i) => i !== idx)
    });
  };

  const addBalanceCalc = () => {
    setFormData({
      ...formData,
      balanceCalculations: [...formData.balanceCalculations, {
        id: generateId('b'),
        equation: '',
        isBalanced: true,
        calculatedAt: new Date().toISOString(),
      }]
    });
  };

  const updateBalanceCalc = (idx: number, field: keyof BalanceCalculation, value: string | boolean) => {
    const newCalcs = [...formData.balanceCalculations];
    (newCalcs[idx] as any)[field] = value;
    newCalcs[idx].calculatedAt = new Date().toISOString();
    setFormData({ ...formData, balanceCalculations: newCalcs });
  };

  const removeBalanceCalc = (idx: number) => {
    setFormData({
      ...formData,
      balanceCalculations: formData.balanceCalculations.filter((_, i) => i !== idx)
    });
  };

  const addSpectrumData = () => {
    setFormData({
      ...formData,
      spectrumData: [...formData.spectrumData, {
        id: generateId('s'),
        dataType: 'HPLC',
        measuredAt: new Date().toISOString(),
        hasAbnormality: false,
        isSupplement: false,
      }]
    });
  };

  const updateSpectrumData = (idx: number, field: keyof SpectrumData, value: string | boolean) => {
    const newData = [...formData.spectrumData];
    (newData[idx] as any)[field] = value;
    newData[idx].measuredAt = new Date().toISOString();
    setFormData({ ...formData, spectrumData: newData });
  };

  const removeSpectrumData = (idx: number) => {
    setFormData({
      ...formData,
      spectrumData: formData.spectrumData.filter((_, i) => i !== idx)
    });
  };

  const handleSubmit = (submitType: '草稿' | '已提交') => {
    setShowValidation(true);
    const allErrors = formData.reagents.flatMap(r => getValidationErrors(validateReagentConcentration(r)));
    const abnormalitySummary = allErrors.map(e => e.message);

    formData.balanceCalculations.forEach(b => {
      if (!b.isBalanced) {
        abnormalitySummary.push(`化学方程式「${b.equation}」未配平${b.note ? '（备注：' + b.note + '）' : ''}`);
      }
    });

    formData.spectrumData.forEach(s => {
      if (s.hasAbnormality) {
        abnormalitySummary.push(`谱图数据（${s.dataType}）存在异常${s.abnormalityNote ? '：' + s.abnormalityNote : '，未说明原因'}`);
      }
    });

    const record: ExperimentRecord = {
      ...formData,
      id: generateId('exp'),
      status: submitType,
      hasAbnormalities: abnormalitySummary.length > 0,
      abnormalitySummary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSubmit(record);
  };

  const getReagentErrors = (reagent: Reagent) => {
    return getValidationErrors(validateReagentConcentration(reagent));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FlaskConical className="text-blue-600" />
        录入实验记录
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">实验名称 <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.experimentName}
            onChange={e => setFormData({ ...formData, experimentName: e.target.value })}
            placeholder="如：酸碱中和滴定实验"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">实验日期 <span className="text-red-500">*</span></label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.experimentDate}
            onChange={e => setFormData({ ...formData, experimentDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">实验人 <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.experimenter}
            onChange={e => setFormData({ ...formData, experimenter: e.target.value })}
            placeholder="如：张同学"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.courseName}
            onChange={e => setFormData({ ...formData, courseName: e.target.value })}
            placeholder="如：分析化学实验"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">废液类别 <span className="text-red-500">*</span></label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.wasteCategory}
            onChange={e => setFormData({ ...formData, wasteCategory: e.target.value as any })}
          >
            {WASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">废液桶编号 <span className="text-red-500">*</span></label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.bucketNumber}
            onChange={e => setFormData({ ...formData, bucketNumber: e.target.value })}
          >
            {BUCKET_NUMBERS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">使用试剂 <span className="text-red-500">*</span></h3>
          <button
            type="button"
            onClick={addReagent}
            className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100"
          >
            <Plus size={16} /> 添加试剂
          </button>
        </div>

        {formData.reagents.map((reagent, idx) => {
          const errors = showValidation ? getReagentErrors(reagent) : [];
          const hasError = errors.length > 0;
          return (
            <div key={reagent.id} className={`border rounded-lg p-4 mb-3 ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">试剂 #{idx + 1}</span>
                {formData.reagents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReagent(idx)}
                    className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <Trash2 size={14} /> 删除
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">试剂名称</label>
                  <input
                    type="text"
                    className={`w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-400' : 'border-gray-300'}`}
                    value={reagent.name}
                    onChange={e => updateReagent(idx, 'name', e.target.value)}
                    placeholder="如：盐酸"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">化学式</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reagent.formula}
                    onChange={e => updateReagent(idx, 'formula', e.target.value)}
                    placeholder="如：HCl"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${hasError ? 'text-red-600 font-medium' : 'text-gray-600'}`}>浓度值</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    value={reagent.concentration || ''}
                    onChange={e => updateReagent(idx, 'concentration', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">浓度单位</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reagent.concentrationUnit}
                    onChange={e => updateReagent(idx, 'concentrationUnit', e.target.value)}
                  >
                    <option value="mol/L">mol/L</option>
                    <option value="g/L">g/L</option>
                    <option value="mg/mL">mg/mL</option>
                    <option value="%">%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">体积</label>
                  <input
                    type="number"
                    step="1"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reagent.volume || ''}
                    onChange={e => updateReagent(idx, 'volume', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">体积单位</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reagent.volumeUnit}
                    onChange={e => updateReagent(idx, 'volumeUnit', e.target.value)}
                  >
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">毒害等级</label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reagent.hazardLevel}
                    onChange={e => updateReagent(idx, 'hazardLevel', e.target.value)}
                  >
                    <option value="低毒">低毒</option>
                    <option value="中毒">中毒</option>
                    <option value="高毒">高毒</option>
                    <option value="剧毒">剧毒</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">pH值</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={reagent.ph ?? ''}
                    onChange={e => updateReagent(idx, 'ph', parseFloat(e.target.value))}
                    placeholder="可选，0-14"
                  />
                </div>
              </div>
              {showValidation && hasError && (
                <div className="mt-3 space-y-1">
                  {errors.map((e, ei) => (
                    <div key={ei} className="flex items-start gap-2 text-sm text-red-700 bg-red-100 rounded p-2">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
                      <div>
                        <div className="font-medium">{e.message}</div>
                        <div className="text-red-600 mt-0.5 text-xs">{e.studentExplanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showValidation && !hasError && reagent.name && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle size={14} className="text-green-600" />
                  浓度校验通过
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Calculator size={18} className="text-purple-600" />
            化学方程式配平
          </h3>
          <button
            type="button"
            onClick={addBalanceCalc}
            className="flex items-center gap-1 text-sm bg-purple-50 text-purple-600 px-3 py-1.5 rounded-md hover:bg-purple-100"
          >
            <Plus size={16} /> 添加方程式
          </button>
        </div>
        {formData.balanceCalculations.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">没有需要配平的方程式可以不填。配平状态每次修改后会自动更新校验结果。</p>
        )}
        {formData.balanceCalculations.map((bc, idx) => (
          <div key={bc.id} className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">方程式 #{idx + 1}</span>
              <button
                type="button"
                onClick={() => removeBalanceCalc(idx)}
                className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
              >
                <Trash2 size={14} /> 删除
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">化学方程式</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bc.equation}
                  onChange={e => updateBalanceCalc(idx, 'equation', e.target.value)}
                  placeholder="如：HCl + NaOH = NaCl + H2O"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">是否已配平</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={bc.isBalanced ? 'true' : 'false'}
                  onChange={e => updateBalanceCalc(idx, 'isBalanced', e.target.value === 'true')}
                >
                  <option value="true">已配平</option>
                  <option value="false">未配平</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-600 mb-1">备注（保留原话）</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={bc.note || ''}
                onChange={e => updateBalanceCalc(idx, 'note', e.target.value)}
                placeholder="可选，如：还没来得及配平"
              />
            </div>
            {!bc.isBalanced && bc.equation && (
              <div className="mt-2 flex items-center gap-1 text-sm text-orange-700 bg-orange-50 rounded p-2">
                <AlertTriangle size={16} className="text-orange-600" />
                <span>此方程式标记为未配平，会作为异常记录留痕。</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-teal-600" />
            谱图数据
          </h3>
          <button
            type="button"
            onClick={addSpectrumData}
            className="flex items-center gap-1 text-sm bg-teal-50 text-teal-600 px-3 py-1.5 rounded-md hover:bg-teal-100"
          >
            <Plus size={16} /> 添加谱图数据
          </button>
        </div>
        {formData.spectrumData.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">暂无谱图数据。补录谱图数据后，异常留痕会自动更新。</p>
        )}
        {formData.spectrumData.map((sd, idx) => (
          <div key={sd.id} className="border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">谱图数据 #{idx + 1}</span>
              <button
                type="button"
                onClick={() => removeSpectrumData(idx)}
                className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
              >
                <Trash2 size={14} /> 删除
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">数据类型</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sd.dataType}
                  onChange={e => updateSpectrumData(idx, 'dataType', e.target.value)}
                >
                  <option value="HPLC">HPLC</option>
                  <option value="GC">GC</option>
                  <option value="IR">IR</option>
                  <option value="UV">UV</option>
                  <option value="NMR">NMR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">是否补录</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sd.isSupplement ? 'true' : 'false'}
                  onChange={e => updateSpectrumData(idx, 'isSupplement', e.target.value === 'true')}
                >
                  <option value="false">原始数据</option>
                  <option value="true">补录数据</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">是否存在异常</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sd.hasAbnormality ? 'true' : 'false'}
                  onChange={e => updateSpectrumData(idx, 'hasAbnormality', e.target.value === 'true')}
                >
                  <option value="false">正常</option>
                  <option value="true">存在异常</option>
                </select>
              </div>
            </div>
            {sd.hasAbnormality && (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-1">异常说明</label>
                <input
                  type="text"
                  className="w-full border border-red-300 rounded-md px-2 py-1.5 text-sm bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={sd.abnormalityNote || ''}
                  onChange={e => updateSpectrumData(idx, 'abnormalityNote', e.target.value)}
                  placeholder="请描述异常情况，留空会被判定为无效记录"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          人工备注 <span className="text-xs text-gray-500">（保留原话，系统不自动修改）</span>
        </label>
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.manualNotes}
          onChange={e => setFormData({ ...formData, manualNotes: e.target.value })}
          placeholder="如：滴定终点颜色偏深，可能NaOH滴多了，废液pH需要重测一下。"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
        >
          <XCircle size={18} /> 取消
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('草稿')}
          className="px-4 py-2 text-gray-700 bg-yellow-100 rounded-md hover:bg-yellow-200"
        >
          保存为草稿
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('已提交')}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-1"
        >
          <CheckCircle size={18} /> 提交记录
        </button>
      </div>
    </div>
  );
}
