import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Clock, RefreshCw, User, CheckCircle2, MousePointer2 } from 'lucide-react';
import type { Patient } from '@/types';
import { PRIORITY_CONFIG } from '@/types';
import { formatTime, getGenderLabel } from '@/utils/helpers';

interface PatientCardProps {
  patient: Patient;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, isSelected, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: patient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityConfig = PRIORITY_CONFIG[patient.currentPriority];
  const waitProgress = Math.min(100, (patient.waitTime / patient.maxWaitTime) * 100);
  const isWarning = waitProgress >= 80;
  const isCritical = patient.currentPriority === 'critical';
  const hasReEvaluate = patient.reEvaluateCount > 0;

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:shadow-md
        ${priorityConfig.bgColor}
        ${isWarning ? 'animate-pulse' : ''}
        ${isCritical ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
      `}
    >
      <button
        onClick={handleSelectClick}
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        className={`
          absolute top-2 left-2 z-10 p-1.5 rounded-full transition-all
          ${isSelected 
            ? 'bg-blue-500 text-white shadow-lg scale-110' 
            : 'bg-white/80 text-gray-500 hover:bg-blue-500 hover:text-white'
          }
        `}
        title={isSelected ? '取消选择' : '选择该患者分配诊室'}
      >
        {isSelected ? <CheckCircle2 size={16} /> : <MousePointer2 size={16} />}
      </button>

      {hasReEvaluate && (
        <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <RefreshCw size={12} />
          复评{patient.reEvaluateCount}次
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center flex-shrink-0">
          <User size={20} className={priorityConfig.color} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800 truncate">{patient.name}</span>
            <span className="text-xs text-gray-500">
              {patient.age}岁 {getGenderLabel(patient.gender)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {patient.symptoms.slice(0, 3).map((symptom, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-white/70 rounded-full text-gray-700"
              >
                {symptom}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                {priorityConfig.label}
              </span>
              {isWarning && (
                <AlertTriangle size={14} className="text-red-500 animate-bounce" />
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Clock size={12} />
              <span>{formatTime(patient.waitTime)}</span>
              <span className="text-gray-400">/</span>
              <span>{formatTime(patient.maxWaitTime)}</span>
            </div>
          </div>

          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                waitProgress >= 100
                  ? 'bg-red-500'
                  : waitProgress >= 80
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${waitProgress}%` }}
            />
          </div>
        </div>
      </div>

      {patient.source && (
        <div className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
          来源：{patient.source}
        </div>
      )}
    </div>
  );
};

export default PatientCard;
