import React, { useState, useEffect } from 'react';
import type { CorrosionTestRecord, CorrosionRating, RecordSource } from '../types';
import { RATING_DESCRIPTIONS, SOURCE_LABELS } from '../types';
import { useApp } from '../context/AppContext';
import { validateRecord } from '../utils/analysis';

interface Props {
  record?: CorrosionTestRecord | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordForm({ record, onClose, onSuccess }: Props) {
  const { state, addRecord, updateRecord } = useApp();
  const isEdit = !!record;

  const [form, setForm] = useState({
    sampleName: record?.sampleName || '',
    batchNo: record?.batchNo || '',
    testDate: record?.testDate || new Date().toISOString().split('T')[0],
    durationHours: record?.durationHours || 48,
    rating: (record?.rating ?? 8) as CorrosionRating,
    operator: record?.operator || '',
    source: (record?.source || 'initial') as RecordSource,
    conclusion: record?.conclusion || 'pending',
    remark: record?.remark || '',
    reagentLedgerIds: record?.reagentLedgerIds || [] as string[]
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const result = validateRecord(
      form,
      state.records.filter(r => r.id !== record?.id),
      state.reagentLedgers.map(r => r.id)
    );
    setErrors(result.errors);
    setWarnings(result.warnings);
  }, [form, state.records, state.reagentLedgers, record?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;

    if (isEdit && record) {
      const result = updateRecord(record.id, form);
      if (result.success) {
        onSuccess?.();
        onClose();
      }
    } else {
      const result = addRecord(form);
      if (result.success) {
        onSuccess?.();
        onClose();
      } else if (result.errors) {
        setErrors(result.errors);
      }
    }
  };

  const handleLedgerToggle = (ledgerId: string) => {
    setForm(prev => ({
      ...prev,
      reagentLedgerIds: prev.reagentLedgerIds.includes(ledgerId)
        ? prev.reagentLedgerIds.filter(id => id !== ledgerId)
        : [...prev.reagentLedgerIds, ledgerId]
    }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? '编辑腐蚀评级记录' : '新增腐蚀评级记录'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.length > 0 && (
              <div className="alert alert-error">
                <div>
                  <strong>无法提交，请修复以下问题：</strong>
                  <ul>
                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="alert alert-warning">
                <div>
                  <strong>提示：</strong>
                  <ul>
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>样品名称<span className="required">*</span></label>
                <input
                  type="text"
                  value={form.sampleName}
                  onChange={e => setForm({ ...form, sampleName: e.target.value })}
                  placeholder="例如：304不锈钢板-A1"
                />
              </div>
              <div className="form-group">
                <label>批号<span className="required">*</span></label>
                <input
                  type="text"
                  value={form.batchNo}
                  onChange={e => setForm({ ...form, batchNo: e.target.value })}
                  placeholder="例如：SS-2026-0410-001"
                />
              </div>
              <div className="form-group">
                <label>试验日期<span className="required">*</span></label>
                <input
                  type="date"
                  value={form.testDate}
                  onChange={e => setForm({ ...form, testDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>试验时长（小时）<span className="required">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={form.durationHours}
                  onChange={e => setForm({ ...form, durationHours: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>腐蚀评级（0-10级）<span className="required">*</span></label>
                <select
                  value={form.rating}
                  onChange={e => setForm({ ...form, rating: parseInt(e.target.value) as CorrosionRating })}
                >
                  {Array.from({ length: 11 }, (_, i) => 10 - i).map(r => (
                    <option key={r} value={r}>
                      {r}级 — {RATING_DESCRIPTIONS[r as CorrosionRating]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>操作人员<span className="required">*</span></label>
                <input
                  type="text"
                  value={form.operator}
                  onChange={e => setForm({ ...form, operator: e.target.value })}
                  placeholder="例如：张工"
                />
              </div>
              <div className="form-group">
                <label>数据来源</label>
                <select
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value as RecordSource })}
                >
                  {(Object.entries(SOURCE_LABELS) as [RecordSource, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>结论状态</label>
                <select
                  value={form.conclusion}
                  onChange={e => setForm({ ...form, conclusion: e.target.value as any })}
                >
                  <option value="pending">待确认</option>
                  <option value="pass">通过</option>
                  <option value="fail">不通过</option>
                  <option value="confirmed">已确认</option>
                </select>
              </div>
            </div>

            <div className="form-group mt-4">
              <label>关联试剂台账（建议至少关联一份氯化钠使用记录）</label>
              <div className="checkbox-group">
                {state.reagentLedgers.length === 0 ? (
                  <span className="text-muted text-sm">暂无试剂台账记录，可在"试剂台账"页面添加</span>
                ) : (
                  state.reagentLedgers.map(ledger => {
                    const reagent = state.reagents.find(r => r.id === ledger.reagentId);
                    return (
                      <label key={ledger.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={form.reagentLedgerIds.includes(ledger.id)}
                          onChange={() => handleLedgerToggle(ledger.id)}
                        />
                        {reagent?.name || ledger.reagentId} — {ledger.testDate}（{ledger.usageAmount}mL）
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="form-group mt-4">
              <label>备注</label>
              <textarea
                value={form.remark}
                onChange={e => setForm({ ...form, remark: e.target.value })}
                placeholder="如有特殊情况请在此说明，如：补录原因、重复导入说明等"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={errors.length > 0}>
              {isEdit ? '保存修改' : '提交记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
