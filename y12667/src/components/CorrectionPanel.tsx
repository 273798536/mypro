import { useState, useEffect } from 'react';
import { Edit3, Save, AlertTriangle, FilePlus, CheckCircle2, X, AlertCircle } from 'lucide-react';
import type { SimulationRecord, UpdateRecordPayload, RiskLevel, NextAction } from '@shared/types';
import { nextActionInfo, formatDateTime } from './constants';

interface Props {
  record: SimulationRecord;
  onSave: (payload: UpdateRecordPayload) => Promise<boolean>;
}

export default function CorrectionPanel({ record, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    startTime: record.startTime,
    endTime: record.endTime,
    riskNote: record.riskNote,
    riskLevel: record.riskLevel as RiskLevel,
    nextAction: record.nextAction as NextAction,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      startTime: record.startTime,
      endTime: record.endTime,
      riskNote: record.riskNote,
      riskLevel: record.riskLevel as RiskLevel,
      nextAction: record.nextAction as NextAction,
    });
    setEditing(false);
    setSaved(false);
  }, [record.id]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (new Date(form.startTime) > new Date(form.endTime)) {
      e.startTime = '开始时间不能晚于结束时间';
    }
    if (!form.riskNote.trim()) {
      e.riskNote = '风险备注不能为空';
    }
    if (form.riskNote.length < 5) {
      e.riskNote = '风险备注至少 5 个字符';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload: UpdateRecordPayload = {};
    if (form.startTime !== record.startTime) payload.startTime = form.startTime;
    if (form.endTime !== record.endTime) payload.endTime = form.endTime;
    if (form.riskNote !== record.riskNote) payload.riskNote = form.riskNote;
    if (form.riskLevel !== record.riskLevel) payload.riskLevel = form.riskLevel;
    if (form.nextAction !== record.nextAction) payload.nextAction = form.nextAction;
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-safety-orange" />
          <h3 className="font-mono text-sm font-semibold text-white">数据修正</h3>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            进入编辑
          </button>
        ) : (
          <button
            onClick={() => {
              setEditing(false);
              setErrors({});
              setForm({
                startTime: record.startTime,
                endTime: record.endTime,
                riskNote: record.riskNote,
                riskLevel: record.riskLevel as RiskLevel,
                nextAction: record.nextAction as NextAction,
              });
            }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
            取消
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {record.nextAction && (
          <ActionGuidance nextAction={record.nextAction} />
        )}

        {saved && (
          <div className="rounded-lg border border-safety-green/30 bg-safety-green/10 px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-safety-green" />
            <span className="text-sm text-safety-green">保存成功，已生成新版本历史记录</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block font-mono">模拟编号</label>
            <div className="input-field bg-slate-900/50 font-mono text-slate-300 text-sm">{record.code}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">开始时间</label>
              <input
                type="datetime-local"
                disabled={!editing}
                value={form.startTime.slice(0, 16)}
                onChange={(e) => setForm({ ...form, startTime: e.target.value + ':00Z' })}
                className={`input-field text-sm ${errors.startTime ? 'border-safety-red' : ''}`}
              />
              {errors.startTime && <p className="text-xs text-safety-red mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">结束时间</label>
              <input
                type="datetime-local"
                disabled={!editing}
                value={form.endTime.slice(0, 16)}
                onChange={(e) => setForm({ ...form, endTime: e.target.value + ':00Z' })}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">风险等级</label>
            <select
              disabled={!editing}
              value={form.riskLevel}
              onChange={(e) => setForm({ ...form, riskLevel: e.target.value as RiskLevel })}
              className="input-field text-sm"
            >
              <option value="normal">正常</option>
              <option value="warning">警告</option>
              <option value="error">错误</option>
              <option value="pending_material">待补材料</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">下一步操作指引</label>
            <select
              disabled={!editing}
              value={form.nextAction || ''}
              onChange={(e) => setForm({ ...form, nextAction: (e.target.value || null) as NextAction })}
              className="input-field text-sm"
            >
              <option value="">无</option>
              <option value="fill_material">补材料</option>
              <option value="adjust_criteria">改口径</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 flex items-center justify-between">
              <span>风险备注</span>
              <span className="text-slate-500">{form.riskNote.length} 字</span>
            </label>
            <textarea
              disabled={!editing}
              rows={4}
              value={form.riskNote}
              onChange={(e) => setForm({ ...form, riskNote: e.target.value })}
              className={`input-field text-sm resize-none ${errors.riskNote ? 'border-safety-red' : ''}`}
            />
            {errors.riskNote && <p className="text-xs text-safety-red mt-1">{errors.riskNote}</p>}
          </div>

          <div className="text-[11px] text-slate-500 space-y-0.5">
            <div>创建时间：{formatDateTime(record.createdAt)}</div>
            <div>最近更新：{formatDateTime(record.updatedAt)}</div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存修正并生成版本'}
          </button>
        </div>
      )}
    </div>
  );
}

function ActionGuidance({ nextAction }: { nextAction: Exclude<NextAction, null> }) {
  const info = nextActionInfo[nextAction];
  const Icon = nextAction === 'fill_material' ? FilePlus : AlertCircle;
  const color = info.color;

  return (
    <div className={`rounded-lg border p-4 bg-${color}/5 border-${color}/30`}
      style={nextAction === 'fill_material'
        ? { background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.3)' }
        : { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={nextAction === 'fill_material' ? 'w-5 h-5 text-safety-orange' : 'w-5 h-5 text-safety-green'} />
        <div className={`font-semibold ${nextAction === 'fill_material' ? 'text-safety-orange' : 'text-safety-green'}`}>
          下一步：{info.label}
        </div>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed mb-2">{info.desc}</p>
      <ol className="space-y-1">
        {info.steps.map((s, i) => (
          <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
            <span className="font-mono text-slate-500 shrink-0">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
