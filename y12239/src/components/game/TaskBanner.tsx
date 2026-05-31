import { MapPin, Ruler, AlertCircle, Target } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getTaskById } from '@/data/tasks';
import { getUnitLabel } from '@/utils/geometry';

export function TaskBanner() {
  const { currentSession } = useGameStore();
  const task = currentSession ? getTaskById(currentSession.taskId) : null;

  if (!task) return null;

  const targetPoints = currentSession?.surveyPoints.filter((p) => p.isTarget) || [];
  const measuredCount = targetPoints.filter((p) => p.measured).length;

  return (
    <div className="bg-gradient-to-r from-[#0F3460] to-[#1a4a8a] rounded-xl p-4 text-white shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} className="text-[#FFD93D]" />
            <h2 className="font-bold font-['Orbitron'] text-lg">{task.name}</h2>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{task.description}</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <div className="flex items-center gap-1 text-xs text-white/60 mb-1">
              <Ruler size={12} />
              <span>角度范围</span>
            </div>
            <div className="font-bold font-['Orbitron']">
              {task.angleMin}° ~ {task.angleMax}°
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <div className="flex items-center gap-1 text-xs text-white/60 mb-1">
              <AlertCircle size={12} />
              <span>单位要求</span>
            </div>
            <div className="font-bold font-['Orbitron']">
              {getUnitLabel(task.requiredUnit)} ({task.requiredUnit})
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
            <div className="flex items-center gap-1 text-xs text-white/60 mb-1">
              <MapPin size={12} />
              <span>目标点</span>
            </div>
            <div className="font-bold font-['Orbitron']">
              {measuredCount}/{task.targetPoints}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center gap-6">
          <span className="text-xs text-white/60">测绘点列表：</span>
          <div className="flex gap-2 flex-wrap">
            {targetPoints.map((point) => (
              <div
                key={point.id}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  transition-all duration-300
                  ${point.measured
                    ? 'bg-[#16C79A] text-white'
                    : 'bg-white/20 text-white/80'
                  }
                `}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {point.order}
                </span>
                <span>{point.name}</span>
                {point.measured && <span className="text-[10px]">✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
