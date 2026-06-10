import React, { useState } from 'react';
import { X, AlertCircle, Save, Info } from 'lucide-react';
import { BatchReport, ReactionCondition } from '../types';
import { useReportStore } from '../store/useReportStore';
import { getSupplementLabel, getStatusText } from '../utils/validation';

interface Props {
  batch: BatchReport;
  onClose: () => void;
}

export const SupplementModal: React.FC<Props> = ({ batch, onClose }) => {
  const supplementBatch = useReportStore((s) => s.supplementBatch);
  const [form, setForm] = useState<
    Partial<ReactionCondition> & { hasBlankControl?: boolean; selectivity?: number }
  >({});
  const [note, setNote] = useState('');
  const [operator, setOperator] = useState(batch.researcher);

  const requiredFields = batch.retestSuggestion?.supplementRequired || [];

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (Object.keys(form).length === 0 && !note.trim()) {
      return;
    }
    supplementBatch(batch.id, form, note.trim(), operator || batch.researcher);
    onClose();
  };

  const hasChanges = Object.keys(form).length > 0 || note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden card-paper flex flex-col">
        <div className="p-5 border-b border-paper-200 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-semibold text-brand-800">补录反应条件</h3>
              <span className={`tag-${batch.status === 'success' ? 'success' : batch.status === 'pending' ? 'pending' : 'failed'}`}>
                {getStatusText(batch.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 font-mono">
              {batch.batchNo} · {batch.researcher} · {batch.targetCompound}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-paper-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {requiredFields.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">系统建议补录以下字段：</p>
                <div className="flex flex-wrap gap-1.5">
                  {requiredFields.map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-700">
                      {getSupplementLabel(f)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">温度 (℃)</label>
              <input
                type="number"
                className="input-field font-mono"
                placeholder={String(batch.conditions.temperature)}
                value={form.temperature ?? ''}
                onChange={(e) => updateField('temperature', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="label-field">压力 (atm)</label>
              <input
                type="number"
                step="0.1"
                className="input-field font-mono"
                placeholder={String(batch.conditions.pressure)}
                value={form.pressure ?? ''}
                onChange={(e) => updateField('pressure', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="label-field">催化剂类型</label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder={batch.conditions.catalystType}
                value={form.catalystType ?? ''}
                onChange={(e) => updateField('catalystType', e.target.value || undefined)}
              />
            </div>
            <div>
              <label className="label-field">催化剂装载量 (mol%)</label>
              <input
                type="number"
                step="0.1"
                className="input-field font-mono"
                placeholder={String(batch.conditions.catalystLoading)}
                value={form.catalystLoading ?? ''}
                onChange={(e) => updateField('catalystLoading', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="label-field">催化剂批号</label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder={batch.conditions.catalystBatchNo || '未记录'}
                value={form.catalystBatchNo ?? ''}
                onChange={(e) => updateField('catalystBatchNo', e.target.value || undefined)}
              />
            </div>
            <div>
              <label className="label-field">溶剂</label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder={batch.conditions.solvent}
                value={form.solvent ?? ''}
                onChange={(e) => updateField('solvent', e.target.value || undefined)}
              />
            </div>
            <div>
              <label className="label-field">反应时间 (h)</label>
              <input
                type="number"
                className="input-field font-mono"
                placeholder={String(batch.conditions.reactionTime)}
                value={form.reactionTime ?? ''}
                onChange={(e) => updateField('reactionTime', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div>
              <label className="label-field">选择性 (%)</label>
              <input
                type="number"
                step="0.1"
                className="input-field font-mono"
                placeholder={String(batch.selectivity)}
                value={form.selectivity ?? ''}
                onChange={(e) => updateField('selectivity', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className="col-span-2">
              <label className="label-field">重复实验结果</label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder={batch.conditions.repeatExperimentResult || '例如：复测选择性 88.2%，与首次结果一致'}
                value={form.repeatExperimentResult ?? ''}
                onChange={(e) => updateField('repeatExperimentResult', e.target.value || undefined)}
              />
            </div>
            <div className="col-span-2">
              <label className="label-field flex items-center gap-2">
                <span>空白对照状态</span>
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-paper-100 border border-paper-200">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={form.hasBlankControl === undefined ? batch.hasBlankControl : form.hasBlankControl === true}
                    onChange={() => updateField('hasBlankControl', true)}
                    className="text-brand-700"
                  />
                  <span className={batch.hasBlankControl || form.hasBlankControl === true ? 'text-status-success font-medium' : 'text-gray-600'}>
                    空白对照完整
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={!batch.hasBlankControl && form.hasBlankControl !== true && form.hasBlankControl !== undefined ? false : form.hasBlankControl === false}
                    onChange={() => updateField('hasBlankControl', false)}
                    className="text-status-failed"
                  />
                  <span className={!batch.hasBlankControl || form.hasBlankControl === false ? 'text-status-failed font-medium' : 'text-gray-600'}>
                    空白对照缺失
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="label-field">补录备注（原样保留）</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              placeholder="请如实描述补录原因或实验细节，系统将原样保留到批次追踪中..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">
              提示：此备注将原样保存，不做自动润色或格式调整
            </p>
          </div>

          <div>
            <label className="label-field">操作人</label>
            <input
              type="text"
              className="input-field"
              placeholder={batch.researcher}
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-paper-200 flex items-center justify-between bg-paper-100/50">
          <p className="text-xs text-gray-500">
            {hasChanges ? (
              <span className="text-brand-700 font-medium">已检测到字段变更，提交后系统将自动重新校验</span>
            ) : (
              <span>尚未修改任何字段</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button onClick={handleSubmit} disabled={!hasChanges} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" />
              提交补录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
