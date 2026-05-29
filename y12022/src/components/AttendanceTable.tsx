import { useState } from 'react';
import {
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserPlus,
  LogOut,
  GitBranch,
  Eye,
  CheckSquare,
} from 'lucide-react';
import { Attendance } from '../types';
import { useStore } from '../store/useStore';

interface AttendanceTableProps {
  attendances: Attendance[];
}

export const AttendanceTable = ({ attendances }: AttendanceTableProps) => {
  const coursePacks = useStore((state) => state.coursePacks);
  const confirmAttendance = useStore((state) => state.confirmAttendance);
  const setSelectedAttendanceId = useStore((state) => state.setSelectedAttendanceId);
  const setTraceModalOpen = useStore((state) => state.setTraceModalOpen);

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const statusConfig = {
    scheduled: {
      label: '待上课',
      color: 'bg-gray-100 text-gray-600',
      icon: Calendar,
    },
    checked_in: {
      label: '已签到',
      color: 'bg-blue-100 text-blue-700',
      icon: CheckCircle2,
    },
    confirmed: {
      label: '已确认',
      color: 'bg-emerald-100 text-emerald-700',
      icon: CheckSquare,
    },
    leave: {
      label: '请假',
      color: 'bg-amber-100 text-amber-700',
      icon: LogOut,
    },
    absent: {
      label: '缺勤',
      color: 'bg-red-100 text-red-700',
      icon: XCircle,
    },
  };

  const handleConfirm = (id: string) => {
    confirmAttendance(id, '当前用户');
  };

  const handleTrace = (id: string) => {
    setSelectedAttendanceId(id);
    setTraceModalOpen(true);
  };

  const getStudentName = (coursePackId: string) => {
    return coursePacks.find((cp) => cp.id === coursePackId)?.studentName || '未知';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                学员
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                老师
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                标记
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                确认人
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {attendances.map((attendance) => {
              const config = statusConfig[attendance.status];
              const StatusIcon = config.icon;
              return (
                <tr
                  key={attendance.id}
                  onMouseEnter={() => setHoveredRow(attendance.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`transition-colors ${
                    hoveredRow === attendance.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{attendance.date}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-800">
                      {getStudentName(attendance.coursePackId)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{attendance.teacherName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {attendance.hasSubstitute && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                        <UserPlus className="w-3 h-3" />
                        代课
                      </span>
                    )}
                    {attendance.hasLeave && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                        <LogOut className="w-3 h-3" />
                        请假
                      </span>
                    )}
                    {attendance.isMakeup && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                        <Clock className="w-3 h-3" />
                        补课
                      </span>
                    )}
                    {!attendance.hasSubstitute && !attendance.hasLeave && !attendance.isMakeup && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {attendance.confirmedBy || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleTrace(attendance.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title="追溯"
                  >
                    <GitBranch className="w-4 h-4" />
                  </button>
                  {attendance.status === 'checked_in' && !attendance.confirmed && (
                    <button
                      onClick={() => handleConfirm(attendance.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      确认课消
                    </button>
                  )}
                  </div>
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
