import { useState, useMemo } from 'react';
import { Search, Filter, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CoursePackCard } from '../components/CoursePackCard';
import { AttendanceTable } from '../components/AttendanceTable';
import { AuditTimeline } from '../components/AuditTimeline';
import { TraceModal } from '../components/TraceModal';

export const Dashboard = () => {
  const coursePacks = useStore((state) => state.coursePacks);
  const attendances = useStore((state) => state.attendances);
  const auditLogs = useStore((state) => state.auditLogs);
  const selectedCoursePackId = useStore((state) => state.selectedCoursePackId);
  const setSelectedCoursePackId = useStore((state) => state.setSelectedCoursePackId);
  const filterStudent = useStore((state) => state.filterStudent);
  const filterTeacher = useStore((state) => state.filterTeacher);
  const filterStatus = useStore((state) => state.filterStatus);
  const setFilterStudent = useStore((state) => state.setFilterStudent);
  const setFilterTeacher = useStore((state) => state.setFilterTeacher);
  const setFilterStatus = useStore((state) => state.setFilterStatus);

  const [showFilters, setShowFilters] = useState(false);

  const filteredAttendances = useMemo(() => {
    let result = attendances;

    if (selectedCoursePackId) {
      result = result.filter((a) => a.coursePackId === selectedCoursePackId);
    }

    if (filterStudent) {
      const selectedPack = coursePacks.find((cp) => cp.id === selectedCoursePackId);
      if (!selectedPack?.studentName.includes(filterStudent)) {
        const matchingPacks = coursePacks.filter((cp) =>
          cp.studentName.includes(filterStudent)
        );
        result = result.filter((a) =>
          matchingPacks.some((cp) => cp.id === a.coursePackId)
        );
      }
    }

    if (filterTeacher) {
      result = result.filter((a) => a.teacherName.includes(filterTeacher));
    }

    if (filterStatus) {
      result = result.filter((a) => a.status === filterStatus);
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendances, selectedCoursePackId, filterStudent, filterTeacher, filterStatus, coursePacks]);

  const stats = useMemo(() => {
    const confirmed = attendances.filter((a) => a.confirmed).length;
    const pending = attendances.filter((a) => a.status === 'checked_in' && !a.confirmed).length;
    const hasSubstitute = attendances.filter((a) => a.hasSubstitute).length;
    const hasLeave = attendances.filter((a) => a.hasLeave).length;

    return { confirmed, pending, hasSubstitute, hasLeave };
  }, [attendances]);

  const recentLogs = useMemo(() => {
    return [...auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [auditLogs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已确认课消</p>
                <p className="text-2xl font-bold text-gray-800">{stats.confirmed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">待确认</p>
                <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">代课记录</p>
                <p className="text-2xl font-bold text-gray-800">{stats.hasSubstitute}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">请假记录</p>
                <p className="text-2xl font-bold text-gray-800">{stats.hasLeave}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">学员课包</h2>
              <button
                onClick={() => setSelectedCoursePackId(null)}
                className="text-xs text-teal-600 hover:text-teal-700"
              >
                重置筛选
              </button>
            </div>
            <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-2">
              {coursePacks.map((cp) => (
                <CoursePackCard
                  key={cp.id}
                  coursePack={cp}
                  isSelected={selectedCoursePackId === cp.id}
                  onClick={() => setSelectedCoursePackId(selectedCoursePackId === cp.id ? null : cp.id)}
                />
              ))}
            </div>
          </div>

          <div className="col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                签到与课消记录
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredAttendances.length}条)
                </span>
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                筛选
              </button>
            </div>

            {showFilters && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      学员姓名
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={filterStudent}
                        onChange={(e) => setFilterStudent(e.target.value)}
                        placeholder="搜索学员..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      授课老师
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        placeholder="搜索老师..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      状态
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">全部状态</option>
                      <option value="scheduled">待上课</option>
                      <option value="checked_in">已签到</option>
                      <option value="confirmed">已确认</option>
                      <option value="leave">请假</option>
                      <option value="absent">缺勤</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <AttendanceTable attendances={filteredAttendances} />
          </div>

          <div className="col-span-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">最近操作</h2>
            <AuditTimeline logs={recentLogs} title="" maxItems={5} />
          </div>
        </div>
      </div>

      <TraceModal />
    </div>
  );
};
