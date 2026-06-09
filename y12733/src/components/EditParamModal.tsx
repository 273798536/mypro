import { useEffect, useState } from 'react';
import { X, Save, ArrowRight } from 'lucide-react';
import { CondProbParam, DataStatus } from '@/types';
import { useCondProbStore } from '@/store/useCondProbStore';
import { calcProbability, formatPercent, generateExplanation } from '@/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EditParamModal({ open, onClose }: Props) {
  const { editingParam, updateParam, addParam, setEditingParam } = useCondProbStore();
  const isNew = !editingParam;

  const [form, setForm] = useState({
    condition: '',
    outcome: '',
    jointCount: 0,
    conditionCount: 0,
    status: 'pending' as DataStatus,
    explanation: '',
    isBoundary: false,
    boundaryNote: '',
  });
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (editingParam) {
      setForm({
        condition: editingParam.condition,
        outcome: editingParam.outcome,
        jointCount: editingParam.jointCount,
        conditionCount: editingParam.conditionCount,
        status: editingParam.status,
        explanation: editingParam.explanation,
        isBoundary: editingParam.isBoundary,
        boundaryNote: editingParam.boundaryNote ?? '',
      });
    } else {
      setForm({
        condition: '',
        outcome: '',
        jointCount: 0,
        conditionCount: 0,
        status: 'pending',
        explanation: '',
        isBoundary: false,
        boundaryNote: '',
      });
    }
    setReason('');
  }, [editingParam, open]);

  if (!open) return null;

  const probability = calcProbability(form.jointCount, form.conditionCount);
  const liveExplanation = generateExplanation(probability, form.status, form.jointCount, form.conditionCount);

  const handleSubmit = () => {
    if (!form.condition.trim() || !form.outcome.trim()) {
      alert('请填写条件描述和结果描述');
      return;
    }
    if (!isNew && !reason.trim()) {
      alert('请填写修正理由，用于留痕');
      return;
    }
    if (isNew) {
      addParam({
        condition: form.condition,
        outcome: form.outcome,
        jointCount: form.jointCount,
        conditionCount: form.conditionCount,
        status: form.status,
        isBoundary: form.isBoundary,
        boundaryNote: form.boundaryNote || undefined,
      });
    } else if (editingParam) {
      updateParam(
        editingParam.id,
        {
          condition: form.condition,
          outcome: form.outcome,
          jointCount: form.jointCount,
          conditionCount: form.conditionCount,
          status: form.status,
          isBoundary: form.isBoundary,
          boundaryNote: form.boundaryNote || undefined,
        },
        reason,
      );
    }
    setEditingParam(null);
    onClose();
  };

  const DiffRow = ({ label, oldV, newV, changed }: { label: string; oldV: string; newV: string; changed: boolean }) => (
    <div className={`grid grid-cols-[90px_1fr_auto_1fr] items-center gap-2 py-1.5 text-sm ${changed ? 'bg-amber-50/50 -mx-2 px-2 rounded' : ''}`}>
      <div className="text-ink-500 text-xs">{label}</div>
      <div className={`font-mono truncate ${changed ? 'text-rose-700 line-through' : 'text-ink-600'}`}>{oldV || '—'}</div>
      <ArrowRight className={`w-3.5 h-3.5 ${changed ? 'text-amber-500' : 'text-ink-300'}`} />
      <div className={`font-mono truncate ${changed ? 'text-emerald-700 font-medium' : 'text-ink-600'}`}>{newV || '—'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl border border-ink-100 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink-800">{isNew ? '新增条件概率参数' : '人工修正参数'}</h2>
            <p className="text-xs text-ink-500 mt-0.5">
              {isNew ? '录入新的参数行，初始状态为待确认。' : '修改后将生成变更日志，审核通过后状态正式更新。'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-ink-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">条件描述（A）</label>
              <input
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm"
                placeholder="例：用户注册满30天"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">结果描述（B）</label>
              <input
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm"
                placeholder="例：完成首次付费"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">条件样本数 N(A)</label>
              <input
                type="number"
                min={0}
                value={form.conditionCount}
                onChange={(e) => setForm({ ...form, conditionCount: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">交集样本数 N(A∩B)</label>
              <input
                type="number"
                min={0}
                value={form.jointCount}
                onChange={(e) => setForm({ ...form, jointCount: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">数据状态</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as DataStatus })}
                className="w-full px-3 py-2 rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm bg-white"
              >
                <option value="available">可用</option>
                <option value="pending">暂缓</option>
                <option value="recollect">需重新采集</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">实时概率预览</label>
              <div className="px-3 py-2 rounded-md bg-ink-50 border border-ink-100 text-sm font-serif font-semibold text-ink-800">
                P(B|A) = {formatPercent(probability)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">结果说明（自动生成，可覆盖）</label>
            <textarea
              value={form.explanation || liveExplanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm resize-none"
              placeholder={liveExplanation}
            />
            <p className="text-[11px] text-ink-400 mt-1">留空则使用自动生成说明：{liveExplanation}</p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.isBoundary}
                onChange={(e) => setForm({ ...form, isBoundary: e.target.checked })}
                className="w-4 h-4 rounded border-ink-300 text-ink-700 focus:ring-ink-400"
              />
              标记为边界样例
            </label>
            {form.isBoundary && (
              <input
                value={form.boundaryNote}
                onChange={(e) => setForm({ ...form, boundaryNote: e.target.value })}
                className="flex-1 px-3 py-1.5 text-xs rounded-md border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-300"
                placeholder="边界问题描述…"
              />
            )}
          </div>

          {!isNew && editingParam && (
            <div className="p-4 rounded-xl bg-ink-50/60 border border-ink-100">
              <div className="text-xs font-semibold text-ink-600 mb-2 uppercase tracking-wider">变更对比预览</div>
              <div className="space-y-0.5">
                <DiffRow label="条件" oldV={editingParam.condition} newV={form.condition} changed={editingParam.condition !== form.condition} />
                <DiffRow label="结果" oldV={editingParam.outcome} newV={form.outcome} changed={editingParam.outcome !== form.outcome} />
                <DiffRow label="N(A)" oldV={String(editingParam.conditionCount)} newV={String(form.conditionCount)} changed={editingParam.conditionCount !== form.conditionCount} />
                <DiffRow label="N(A∩B)" oldV={String(editingParam.jointCount)} newV={String(form.jointCount)} changed={editingParam.jointCount !== form.jointCount} />
                <DiffRow label="概率" oldV={formatPercent(editingParam.probability)} newV={formatPercent(probability)} changed={editingParam.probability !== probability} />
                <DiffRow label="状态" oldV={editingParam.status} newV={form.status} changed={editingParam.status !== form.status} />
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-ink-600 mb-1">修正理由（必填，留痕）</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="例如：样本数更新至最新批次；审核通过后数据状态变更…"
                  className="w-full px-3 py-2 rounded-md border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 focus:border-ink-400 text-sm resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-ink-100 bg-ink-50/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-ink-600 hover:bg-ink-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-ink-700 hover:bg-ink-800 text-white font-medium shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {isNew ? '新增（待确认）' : '保存变更'}
          </button>
        </div>
      </div>
    </div>
  );
}

type _P = CondProbParam;
export type { _P };
