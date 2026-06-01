import { useState, useEffect } from 'react';
import { useApp } from '../store';
import { convertLengthToMeters } from '../physics';
import type { PendulumRecord, LengthUnit, AngleUnit } from '../types';
import { Plus, X, Edit2 } from 'lucide-react';

interface RecordFormProps {
  editingRecord?: PendulumRecord | null;
  onCancel?: () => void;
}

export const RecordForm = ({ editingRecord, onCancel }: RecordFormProps) => {
  const { state, addRecord, updateRecord, getRecordAnomalies } = useApp();
  
  const [length, setLength] = useState('');
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('m');
  const [lengthUnitConfirmed, setLengthUnitConfirmed] = useState(false);
  const [angle, setAngle] = useState('');
  const [angleUnit, setAngleUnit] = useState<AngleUnit>('deg');
  const [totalTiming, setTotalTiming] = useState('');
  const [measuredCount, setMeasuredCount] = useState('');
  const [measuredPeriod, setMeasuredPeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [batchId, setBatchId] = useState('');

  useEffect(() => {
    if (editingRecord) {
      setLength(editingRecord.length.toString());
      setLengthUnit(editingRecord.lengthUnit);
      setLengthUnitConfirmed(editingRecord.lengthUnitConfirmed);
      setAngle(editingRecord.angle.toString());
      setAngleUnit(editingRecord.angleUnit);
      setTotalTiming(editingRecord.totalTiming.toString());
      setMeasuredCount(editingRecord.measuredCount.toString());
      setMeasuredPeriod(editingRecord.measuredPeriod.toString());
      setNotes(editingRecord.notes);
      setSourceRef(editingRecord.sourceRef || '');
      setBatchId(editingRecord.batchId);
    } else {
      if (state.selectedBatchId) {
        setBatchId(state.selectedBatchId);
      } else if (state.batches.length > 0) {
        setBatchId(state.batches[0].id);
      }
    }
  }, [editingRecord, state.selectedBatchId, state.batches]);

  useEffect(() => {
    const timing = parseFloat(totalTiming);
    const count = parseInt(measuredCount);
    if (timing > 0 && count > 0) {
      setMeasuredPeriod((timing / count).toFixed(4));
    }
  }, [totalTiming, measuredCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const recordData = {
      batchId,
      length: parseFloat(length),
      lengthUnit,
      lengthUnitConfirmed,
      angle: parseFloat(angle),
      angleUnit,
      totalTiming: parseFloat(totalTiming),
      measuredCount: parseInt(measuredCount),
      measuredPeriod: parseFloat(measuredPeriod),
      notes,
      sourceRef: sourceRef || undefined
    };

    if (editingRecord) {
      updateRecord({
        ...editingRecord,
        ...recordData
      });
    } else {
      addRecord(recordData);
    }

    if (!editingRecord) {
      setLength('');
      setAngle('');
      setTotalTiming('');
      setMeasuredCount('');
      setMeasuredPeriod('');
      setNotes('');
      setSourceRef('');
      setLengthUnitConfirmed(false);
    } else if (onCancel) {
      onCancel();
    }
  };

  const isFormValid = 
    length && angle && totalTiming && measuredCount && measuredPeriod &&
    parseFloat(length) > 0 && parseFloat(angle) >= -180 && parseFloat(angle) <= 180 &&
    parseFloat(totalTiming) > 0 && parseInt(measuredCount) > 0 &&
    batchId;

  const previewLength = length ? convertLengthToMeters(parseFloat(length), lengthUnit) : 0;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          {editingRecord ? '编辑摆长记录' : '新增摆长记录'}
        </h3>
        {editingRecord && onCancel && (
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">批次</label>
              <select 
                className="input"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
              >
                <option value="">请选择批次</option>
                {state.batches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">来源参考（可选）</label>
              <input
                type="text"
                className="input"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="如：实验记录本P23"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">摆长</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  step="0.001"
                  min="0"
                  placeholder="0.5"
                  required
                />
                <select
                  className="input w-20"
                  value={lengthUnit}
                  onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}
                >
                  <option value="m">m</option>
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              {length && (
                <p className="text-xs text-slate-500 mt-1">
                  = {previewLength.toFixed(4)} m
                </p>
              )}
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lengthUnitConfirmed}
                  onChange={(e) => setLengthUnitConfirmed(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600">单位已确认</span>
              </label>
            </div>

            <div>
              <label className="label">摆角</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input flex-1"
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  step="0.1"
                  min="-90"
                  max="90"
                  placeholder="5"
                  required
                />
                <select
                  className="input w-20"
                  value={angleUnit}
                  onChange={(e) => setAngleUnit(e.target.value as AngleUnit)}
                >
                  <option value="deg">°</option>
                  <option value="rad">rad</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">总计时 (s)</label>
              <input
                type="number"
                className="input"
                value={totalTiming}
                onChange={(e) => setTotalTiming(e.target.value)}
                step="0.01"
                min="0"
                placeholder="20.05"
                required
              />
            </div>

            <div>
              <label className="label">周期数</label>
              <input
                type="number"
                className="input"
                value={measuredCount}
                onChange={(e) => setMeasuredCount(e.target.value)}
                min="1"
                placeholder="10"
                required
              />
            </div>

            <div>
              <label className="label">测量周期 (s)</label>
              <input
                type="number"
                className="input"
                value={measuredPeriod}
                onChange={(e) => setMeasuredPeriod(e.target.value)}
                step="0.0001"
                min="0"
                placeholder="2.005"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                自动计算 = 总计时 / 周期数
              </p>
            </div>
          </div>

          <div>
            <label className="label">课堂备注</label>
            <textarea
              className="input min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录实验条件、环境因素、操作细节..."
            />
          </div>

          {editingRecord && getRecordAnomalies(editingRecord.id).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium mb-1">
                ⚠️ 检测到 {getRecordAnomalies(editingRecord.id).length} 项异常
              </p>
              <p className="text-xs text-amber-600">
                修改数据后系统会自动重新检测
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {editingRecord && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
              >
                <X size={16} className="mr-1" />
                取消
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isFormValid}
            >
              {editingRecord ? (
                <><Edit2 size={16} className="mr-1" /> 保存修改</>
              ) : (
                <><Plus size={16} className="mr-1" /> 添加记录</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
