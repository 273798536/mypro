import { useState } from 'react';
import { Edit3, Save, X, Ruler, Scale, AlertCircle } from 'lucide-react';
import { GameSession, OperationRecord, CorrectionField, UnitType } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { getTaskById } from '@/data/tasks';
import { calculateTrigonometry, getUnitLabel, validateAngleRange } from '@/utils/geometry';
import { cn } from '@/lib/utils';

interface CorrectionPanelProps {
  session: GameSession;
  onCorrectionApplied?: () => void;
}

export function CorrectionPanel({ session, onCorrectionApplied }: CorrectionPanelProps) {
  const { applyCorrection } = useGameStore();
  const [selectedOperation, setSelectedOperation] = useState<OperationRecord | null>(null);
  const [newValue, setNewValue] = useState<string>('');
  const [teacherName, setTeacherName] = useState('');
  const [remark, setRemark] = useState('');

  const task = session ? getTaskById(session.taskId) : null;

  const correctableOperations = session.operations.filter(
    (op) => op.type === 'angle_measure' || op.type === 'distance_input'
  );

  const getFieldFromOperation = (op: OperationRecord): CorrectionField | null => {
    if (op.type === 'angle_measure') return 'angle';
    if (op.type === 'distance_input') return 'unit';
    return null;
  };

  const getCurrentValue = (op: OperationRecord): string => {
    if (op.type === 'angle_measure') return (op.data.angle ?? 0).toString();
    if (op.type === 'distance_input') return op.data.unit ?? 'm';
    return '';
  };

  const getOperationLabel = (op: OperationRecord): string => {
    const point = session.surveyPoints.find((p) => p.id === op.surveyPointId);
    if (op.type === 'angle_measure') {
      return `角度测量 - ${point?.name || '未知点'}`;
    }
    if (op.type === 'distance_input') {
      return `距离单位 - ${point?.name || '未知点'}`;
    }
    return '';
  };

  const handleSelectOperation = (op: OperationRecord) => {
    setSelectedOperation(op);
    setNewValue(getCurrentValue(op));
    setRemark('');
  };

  const handleApplyCorrection = () => {
    if (!selectedOperation || !teacherName || !newValue) return;

    const field = getFieldFromOperation(selectedOperation);
    if (!field) return;

    let parsedValue: number | string = newValue;
    if (field === 'angle' || field === 'distance') {
      parsedValue = parseFloat(newValue);
      if (isNaN(parsedValue)) return;
    }

    applyCorrection(
      selectedOperation.id,
      field,
      parsedValue,
      teacherName,
      remark
    );

    setSelectedOperation(null);
    setNewValue('');
    setRemark('');
    onCorrectionApplied?.();
  };

  const renderInput = () => {
    if (!selectedOperation) return null;
    const field = getFieldFromOperation(selectedOperation);

    if (field === 'angle') {
      const currentAngle = selectedOperation.data.angle ?? 0;
      const isValid = task ? validateAngleRange(parseFloat(newValue) || 0, task.angleMin, task.angleMax) : true;
      const trig = calculateTrigonometry(parseFloat(newValue) || 0);
      const oldTrig = calculateTrigonometry(currentAngle);

      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-1">
              原角度值
            </label>
            <div className="text-lg font-bold font-['Orbitron'] text-[#E94560] line-through">
              {currentAngle.toFixed(1)}°
            </div>
            <div className="text-xs text-[#2C3E50]/50 mt-1">
              sin: {oldTrig.sin.toFixed(4)}, cos: {oldTrig.cos.toFixed(4)}, tan: {oldTrig.tan.toFixed(4)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-1">
              修正角度值 <span className="text-[#E94560]">*</span>
            </label>
            <input
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              step="0.1"
              className={cn(
                'w-full px-4 py-3 border rounded-lg text-lg font-bold font-orbitron focus:outline-none transition-all',
                isValid
                  ? 'border-[#16C79A] focus:border-[#16C79A] focus:ring-2 focus:ring-[#16C79A]/20'
                  : 'border-[#E94560] focus:border-[#E94560] focus:ring-2 focus:ring-[#E94560]/20 bg-[#E94560]/5'
              )}
              placeholder="输入修正后的角度"
            />
            {task && !isValid && (
              <div className="flex items-center gap-1 mt-1 text-xs text-[#E94560]">
                <AlertCircle size={12} />
                <span>角度超出任务要求范围 {task.angleMin}° ~ {task.angleMax}°</span>
              </div>
            )}
            <div className="text-xs text-[#16C79A] mt-1">
              sin: {trig.sin.toFixed(4)}, cos: {trig.cos.toFixed(4)}, tan: {trig.tan.toFixed(4)}
            </div>
          </div>

          {task && (
            <div className="bg-[#0F3460]/5 rounded-lg p-3 text-xs text-[#0F3460]/70">
              任务要求角度范围: {task.angleMin}° ~ {task.angleMax}°
            </div>
          )}
        </div>
      );
    }

    if (field === 'unit') {
      const currentUnit = selectedOperation.data.unit ?? 'm';

      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-1">
              原单位
            </label>
            <div className="text-lg font-bold font-['Orbitron'] text-[#E94560] line-through">
              {currentUnit} ({getUnitLabel(currentUnit as UnitType)})
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2C3E50] mb-1">
              修正单位 <span className="text-[#E94560]">*</span>
            </label>
            <select
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className={cn(
                'w-full px-4 py-3 border rounded-lg text-lg font-bold font-orbitron focus:outline-none transition-all',
                task && newValue === task.requiredUnit
                  ? 'border-[#16C79A] focus:border-[#16C79A] focus:ring-2 focus:ring-[#16C79A]/20'
                  : 'border-[#0F3460]/20 focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20'
              )}
            >
              <option value="m">米 (m)</option>
              <option value="km">千米 (km)</option>
              <option value="cm">厘米 (cm)</option>
            </select>
          </div>

          {task && (
            <div className="bg-[#16C79A]/10 rounded-lg p-3 text-xs">
              <div className="text-[#16C79A] font-medium mb-1">任务要求单位</div>
              <div className="text-[#2C3E50]">
                {getUnitLabel(task.requiredUnit)} ({task.requiredUnit})
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-[#0F3460]/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#FFD93D]/20 rounded-lg">
          <Edit3 size={20} className="text-[#b8860b]" />
        </div>
        <div>
          <h3 className="font-bold text-[#0F3460] text-lg">手动修正入口</h3>
          <p className="text-sm text-[#2C3E50]/60">
            修正角度尺或距离单位，系统将自动重新计算成绩
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#2C3E50] mb-2">
            选择需要修正的操作 <span className="text-[#E94560]">*</span>
          </label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {correctableOperations.map((op) => {
              const field = getFieldFromOperation(op);
              const Icon = field === 'angle' ? Ruler : Scale;
              const isSelected = selectedOperation?.id === op.id;
              const hasCorrection = session.corrections.some((c) => c.operationId === op.id);

              return (
                <button
                  key={op.id}
                  onClick={() => handleSelectOperation(op)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200',
                    isSelected
                      ? 'border-[#FFD93D] bg-[#FFD93D]/5 shadow-md'
                      : 'border-[#0F3460]/10 hover:border-[#0F3460]/30 hover:bg-[#0F3460]/5',
                    hasCorrection && 'border-[#16C79A]/30 bg-[#16C79A]/5'
                  )}
                >
                  <Icon
                    size={18}
                    className={
                      field === 'angle' ? 'text-[#16C79A]' : 'text-[#f59e0b]'
                    }
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#2C3E50]">
                      {getOperationLabel(op)}
                    </div>
                    <div className="text-xs text-[#2C3E50]/50">
                      当前值: {getCurrentValue(op)}
                      {field === 'angle' ? '°' : ''}
                    </div>
                  </div>
                  {hasCorrection && (
                    <span className="text-xs bg-[#16C79A] text-white px-2 py-0.5 rounded-full">
                      已修正
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedOperation && (
          <div className="pt-4 border-t border-[#0F3460]/10 space-y-4">
            {renderInput()}

            <div>
              <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                教师姓名 <span className="text-[#E94560]">*</span>
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="输入教师姓名"
                className="w-full px-4 py-2 border border-[#0F3460]/20 rounded-lg text-sm focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2C3E50] mb-1">
                修正备注
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="说明修正原因（可选）"
                rows={2}
                className="w-full px-4 py-2 border border-[#0F3460]/20 rounded-lg text-sm focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20 transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApplyCorrection}
                disabled={!newValue || !teacherName}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all duration-300',
                  newValue && teacherName
                    ? 'bg-gradient-to-r from-[#FFD93D] to-[#e6c236] text-[#0F3460] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-[#0F3460]/20 text-[#0F3460]/50 cursor-not-allowed'
                )}
              >
                <Save size={18} />
                <span>应用修正并重新计算</span>
              </button>
              <button
                onClick={() => setSelectedOperation(null)}
                className="px-4 py-3 rounded-xl font-medium text-[#2C3E50]/60 hover:bg-[#0F3460]/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
