import { GraduationCap, Clock, Calendar, Snowflake, CheckCircle, AlertTriangle } from 'lucide-react';
import { CoursePack } from '../types';
import { useStore } from '../store/useStore';

interface CoursePackCardProps {
  coursePack: CoursePack;
  isSelected: boolean;
  onClick: () => void;
}

export const CoursePackCard = ({ coursePack, isSelected, onClick }: CoursePackCardProps) => {
  const deferredRevenue = useStore((state) => state.calculateDeferredRevenue(coursePack.id));
  const progress = (coursePack.usedHours / coursePack.totalHours) * 100;

  const statusConfig = {
    active: { label: '正常', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    frozen: { label: '已冻结', color: 'bg-amber-100 text-amber-700', icon: Snowflake },
    expired: { label: '已过期', color: 'bg-gray-100 text-gray-600', icon: AlertTriangle },
    completed: { label: '已完成', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  };

  const config = statusConfig[coursePack.status];
  const StatusIcon = config.icon;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? 'border-teal-500 bg-teal-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-teal-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{coursePack.studentName}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>课时进度</span>
          </div>
          <span className="font-medium text-gray-800">
            {coursePack.usedHours}/{coursePack.totalHours}
          </span>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>有效期至</span>
          </div>
          <span className="font-medium text-gray-800">{coursePack.expireDate}</span>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">递延收入</span>
            <span className="font-bold text-teal-600">¥{deferredRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
