import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, FileText, ChevronRight, Activity } from 'lucide-react';
import { Task } from '../types/task';
import { getTaskStatusLabel, getTaskStatusColor, formatDate, getRiskLevelLabel } from '../utils/format';
import { getRiskLevelColor, getQualityScoreColor } from '../utils/color';
import { StatusBadge } from './StatusBadge';
import { DataStatus } from '../types/common';

interface TaskCardProps {
  task: Task;
  delay?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, delay = 0 }) => {
  const navigate = useNavigate();

  const getStatusFromQuality = (score: number): DataStatus => {
    if (score >= 90) return DataStatus.AVAILABLE;
    if (score >= 75) return DataStatus.PENDING;
    if (score >= 60) return DataStatus.NEED_REVIEW;
    return DataStatus.RECOLLECT;
  };

  const handleClick = () => {
    navigate(`/tasks/${task.id}/tide`);
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-ocean-300 transition-all duration-300 cursor-pointer group opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
      onClick={handleClick}
    >
      <div className="flex h-full">
        <div
          className={`w-1 flex-shrink-0 ${getRiskLevelColor(task.riskLevel)}`}
        />
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-display text-lg text-slate-900 group-hover:text-ocean-700 transition-colors">
                {task.name}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{task.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-ocean-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </div>

          <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{formatDate(task.uploadedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>{task.uploadedBy}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>{task.statistics.totalRecords} 条记录</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-white ${getTaskStatusColor(task.status)}`}
              >
                {getTaskStatusLabel(task.status)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-white ${getRiskLevelColor(task.riskLevel)}`}
              >
                <Activity className="w-3 h-3" />
                {getRiskLevelLabel(task.riskLevel)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={getStatusFromQuality(task.qualityScore)} size="sm" />
              <span className="text-sm font-mono" style={{ color: getQualityScoreColor(task.qualityScore) }}>
                质量 {task.qualityScore}/100
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
