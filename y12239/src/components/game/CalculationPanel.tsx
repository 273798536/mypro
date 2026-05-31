import { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getTaskById } from '@/data/tasks';
import { calculateTrigonometry, validateAngleRange, getUnitLabel } from '@/utils/geometry';
import { UnitType } from '@/types';
import { cn } from '@/lib/utils';

export function CalculationPanel() {
  const { currentSession, selectedPoint, currentTool, recordDistanceInput } = useGameStore();
  const [distanceValue, setDistanceValue] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<UnitType>('m');

  const task = currentSession ? getTaskById(currentSession.taskId) : null;
  const selectedPointData = currentSession?.surveyPoints.find((p) => p.id === selectedPoint);

  const lastAngleOp = selectedPoint
    ? currentSession?.operations.find(
        (op) => op.type === 'angle_measure' && op.surveyPointId === selectedPoint
      )
    : null;

  const lastDistanceOp = selectedPoint
    ? currentSession?.operations.find(
        (op) => op.type === 'distance_input' && op.surveyPointId === selectedPoint
      )
    : null;

  const angle = lastAngleOp?.data.angle ?? 0;
  const trig = calculateTrigonometry(angle);

  const isAngleValid = task ? validateAngleRange(angle, task.angleMin, task.angleMax) : true;
  const isUnitValid = lastDistanceOp ? lastDistanceOp.data.unit === task?.requiredUnit : true;

  const handleDistanceSubmit = () => {
    if (!selectedPoint || !distanceValue) return;
    const value = parseFloat(distanceValue);
    if (isNaN(value) || value <= 0) return;
    recordDistanceInput(selectedPoint, value, distanceUnit);
    setDistanceValue('');
  };

  const trigRows = [
    { label: 'sin', value: trig.sin, color: '#0F3460' },
    { label: 'cos', value: trig.cos, color: '#16C79A' },
    { label: 'tan', value: trig.tan, color: '#E94560' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-xl shadow-lg border border-[#0F3460]/10">
      <div className="flex items-center gap-2 pb-3 border-b border-[#0F3460]/10">
        <Calculator className="text-[#0F3460]" size={20} />
        <h3 className="font-bold text-[#0F3460] font-['Orbitron']">实时计算面板</h3>
      </div>

      {selectedPointData ? (
        <>
          <div className="bg-[#F5F7FA] rounded-lg p-3">
            <div className="text-xs text-[#0F3460]/60 mb-1">当前选中点</div>
            <div className="font-bold text-[#0F3460] text-lg">{selectedPointData.name}</div>
            <div className="text-xs text-[#2C3E50]/70 mt-1">
              坐标: ({selectedPointData.x}, {selectedPointData.y})
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#2C3E50]">测量角度</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-bold font-["Orbitron"] text-lg',
                    isAngleValid ? 'text-[#16C79A]' : 'text-[#E94560]'
                  )}
                >
                  {angle.toFixed(1)}°
                </span>
                {angle > 0 && (
                  isAngleValid ? (
                    <CheckCircle size={16} className="text-[#16C79A]" />
                  ) : (
                    <AlertTriangle size={16} className="text-[#E94560]" />
                  )
                )}
              </div>
            </div>

            {task && angle > 0 && !isAngleValid && (
              <div className="bg-[#E94560]/10 border border-[#E94560]/30 rounded-lg p-2 text-xs text-[#E94560]">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>角度超出任务要求范围 {task.angleMin}° ~ {task.angleMax}°</span>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-[#0F3460]/60 uppercase tracking-wider">
                三角函数值
              </div>
              <div className="grid grid-cols-3 gap-2">
                {trigRows.map((row) => (
                  <div
                    key={row.label}
                    className="bg-[#F5F7FA] rounded-lg p-2 text-center transition-all duration-300 hover:scale-105"
                  >
                    <div
                      className="text-xs font-semibold mb-1"
                      style={{ color: row.color }}
                    >
                      {row.label}
                    </div>
                    <div
                      className="font-bold font-orbitron"
                      style={{ color: row.color }}
                    >
                      {row.value.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {currentTool === 'distance' && (
            <div className="space-y-3 pt-3 border-t border-[#0F3460]/10">
              <div className="text-xs font-semibold text-[#0F3460]/60 uppercase tracking-wider">
                输入距离
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={distanceValue}
                  onChange={(e) => setDistanceValue(e.target.value)}
                  placeholder="输入距离值"
                  className="flex-1 px-3 py-2 border border-[#0F3460]/20 rounded-lg text-sm focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20 transition-all"
                />
                <select
                  value={distanceUnit}
                  onChange={(e) => setDistanceUnit(e.target.value as UnitType)}
                  className={cn(
                    'px-3 py-2 border rounded-lg text-sm focus:outline-none transition-all',
                    task && distanceUnit !== task.requiredUnit
                      ? 'border-[#E94560] bg-[#E94560]/5'
                      : 'border-[#0F3460]/20 focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/20'
                  )}
                >
                  <option value="m">米 (m)</option>
                  <option value="km">千米 (km)</option>
                  <option value="cm">厘米 (cm)</option>
                </select>
              </div>
              {task && distanceUnit !== task.requiredUnit && (
                <div className="flex items-center gap-2 text-xs text-[#E94560]">
                  <XCircle size={14} />
                  <span>任务要求单位：{getUnitLabel(task.requiredUnit)} ({task.requiredUnit})</span>
                </div>
              )}
              <button
                onClick={handleDistanceSubmit}
                disabled={!distanceValue}
                className={cn(
                  'w-full py-2 rounded-lg font-medium transition-all duration-200',
                  distanceValue
                    ? 'bg-[#0F3460] text-white hover:bg-[#0F3460]/90 active:scale-[0.98]'
                    : 'bg-[#0F3460]/20 text-[#0F3460]/50 cursor-not-allowed'
                )}
              >
                确认距离
              </button>
            </div>
          )}

          {lastDistanceOp && (
            <div className="pt-3 border-t border-[#0F3460]/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#2C3E50]">已记录距离</span>
                {isUnitValid ? (
                  <CheckCircle size={14} className="text-[#16C79A]" />
                ) : (
                  <XCircle size={14} className="text-[#E94560]" />
                )}
              </div>
              <div
                className={cn(
                  'font-bold font-["Orbitron"] text-lg',
                  isUnitValid ? 'text-[#16C79A]' : 'text-[#E94560]'
                )}
              >
                {lastDistanceOp.data.distance} {lastDistanceOp.data.unit}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-[#0F3460]/50">
          <Calculator size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">请先在地图上选择一个测绘点</p>
        </div>
      )}
    </div>
  );
}
