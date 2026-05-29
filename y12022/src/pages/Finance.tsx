import { useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Calendar,
  PieChart,
  BarChart3,
  GitBranch,
  GraduationCap,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { TraceModal } from '../components/TraceModal';

export const Finance = () => {
  const coursePacks = useStore((state) => state.coursePacks);
  const attendances = useStore((state) => state.attendances);
  const revenues = useStore((state) => state.revenues);
  const calculateDeferredRevenue = useStore((state) => state.calculateDeferredRevenue);
  const getRevenueByPeriod = useStore((state) => state.getRevenueByPeriod);
  const setSelectedAttendanceId = useStore((state) => state.setSelectedAttendanceId);
  const setTraceModalOpen = useStore((state) => state.setTraceModalOpen);

  const [selectedPeriod, setSelectedPeriod] = useState('2024-05');

  const stats = useMemo(() => {
    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const periodRevenue = getRevenueByPeriod(selectedPeriod);
    const totalDeferred = coursePacks.reduce((sum, cp) => sum + calculateDeferredRevenue(cp.id), 0);
    const totalCoursePackValue = coursePacks.reduce(
      (sum, cp) => sum + cp.totalHours * cp.unitPrice,
      0
    );
    const confirmedCount = attendances.filter((a) => a.confirmed).length;

    return { totalRevenue, periodRevenue, totalDeferred, totalCoursePackValue, confirmedCount };
  }, [revenues, coursePacks, attendances, selectedPeriod, getRevenueByPeriod, calculateDeferredRevenue]);

  const revenueByStudent = useMemo(() => {
    return coursePacks.map((cp) => {
      const cpRevenues = revenues.filter((r) => r.coursePackId === cp.id);
      const total = cpRevenues.reduce((sum, r) => sum + r.amount, 0);
      const deferred = calculateDeferredRevenue(cp.id);
      return {
        id: cp.id,
        studentName: cp.studentName,
        totalHours: cp.totalHours,
        usedHours: cp.usedHours,
        confirmedRevenue: total,
        deferredRevenue: deferred,
        status: cp.status,
      };
    });
  }, [coursePacks, revenues, calculateDeferredRevenue]);

  const recentRevenues = useMemo(() => {
    return [...revenues]
      .sort((a, b) => new Date(b.recognizedDate).getTime() - new Date(a.recognizedDate).getTime())
      .slice(0, 10)
      .map((r) => {
        const cp = coursePacks.find((c) => c.id === r.coursePackId);
        const attendance = attendances.find((a) => a.id === r.attendanceId);
        return {
          ...r,
          studentName: cp?.studentName || '未知',
          teacherName: attendance?.teacherName || '未知',
        };
      });
  }, [revenues, coursePacks, attendances]);

  const handleTrace = (attendanceId: string) => {
    setSelectedAttendanceId(attendanceId);
    setTraceModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">财务追踪</h1>
          <p className="text-gray-500">按实际上课确认收入，追踪递延收入和课消明细</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white shadow-lg shadow-teal-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-teal-100">累计确认收入</p>
                <p className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">本期确认收入</p>
                <p className="text-2xl font-bold text-gray-800">
                  ¥{stats.periodRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">递延收入</p>
                <p className="text-2xl font-bold text-gray-800">
                  ¥{stats.totalDeferred.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已确认课消</p>
                <p className="text-2xl font-bold text-gray-800">{stats.confirmedCount}次</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">收入确认明细</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="2024-05">2024年5月</option>
                    <option value="2024-04">2024年4月</option>
                    <option value="2024-03">2024年3月</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        日期
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        学员
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        老师
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        金额
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        归属期
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        追溯
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentRevenues.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{r.recognizedDate}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.studentName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{r.teacherName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-teal-600">
                          ¥{r.amount}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                            {r.period}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleTrace(r.attendanceId)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                            title="全链路追溯"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800">学员课包收入分布</h2>
              </div>
              <div className="p-4 space-y-3">
                {revenueByStudent.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-teal-600" />
                        </div>
                        <span className="font-medium text-gray-800">{item.studentName}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'frozen'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.status === 'active' ? '正常' : item.status === 'frozen' ? '已冻结' : '已完成'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-500">
                        已确认收入:
                        <span className="font-medium text-teal-600 ml-1">
                          ¥{item.confirmedRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        递延收入:
                        <span className="font-medium text-amber-600 ml-1">
                          ¥{item.deferredRevenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>课时进度: {item.usedHours}/{item.totalHours}</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(item.usedHours / item.totalHours) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-4">
              <h3 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                收入确认原则说明
              </h3>
              <div className="space-y-2 text-sm text-teal-700">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <p>课包售卖时不确认收入，全部计入递延收入</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <p>学员实际上课签到后，教务确认课消时确认对应收入</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <p>请假不扣课时，补课完成后再确认收入</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <p>代课换老师不影响收入确认，收入归属不变</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <p>课包冻结期间，递延收入保持不变</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TraceModal />
    </div>
  );
};
