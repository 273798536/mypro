import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  MapPin,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageSquareWarning,
  Clock,
  Download,
  BarChart3,
  PieChart,
  Merge,
} from 'lucide-react';
import { usePublicListStore } from '@/store/usePublicListStore';
import { useGisStore } from '@/store/useGisStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import StatusBadge from '@/components/StatusBadge';
import Empty from '@/components/Empty';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function Delivery() {
  const { items, loading, fetchItems } = usePublicListStore();
  const { points, fetchPoints } = useGisStore();
  const { records, getShiftRecords, fetchRecords } = useHistoryStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'shift' | 'export'>('overview');

  useEffect(() => {
    fetchItems();
    fetchPoints();
    fetchRecords();
  }, [fetchItems, fetchPoints, fetchRecords]);

  const shiftRecords = getShiftRecords();

  const stats = useMemo(() => {
    const total = items.length;
    const normal = items.filter(i => i.status === 'normal').length;
    const abnormal = items.filter(i => i.status === 'abnormal').length;
    const overCapacity = items.filter(i => i.status === 'over_capacity').length;
    const complaint = items.filter(i => i.status === 'complaint').length;

    return {
      total,
      normal,
      abnormal,
      overCapacity,
      complaint,
      normalRate: total > 0 ? Math.round((normal / total) * 100) : 0,
    };
  }, [items]);

  const streetStats = useMemo(() => {
    const streetMap = new Map<string, { total: number; normal: number; abnormal: number }>();

    items.forEach(item => {
      const point = points.find(p => p.id === item.gisPointId);
      const street = point?.street || '未知街口';

      if (!streetMap.has(street)) {
        streetMap.set(street, { total: 0, normal: 0, abnormal: 0 });
      }

      const data = streetMap.get(street)!;
      data.total++;
      if (item.status === 'normal') {
        data.normal++;
      } else {
        data.abnormal++;
      }
    });

    return Array.from(streetMap.entries())
      .map(([street, data]) => ({
        street,
        ...data,
        normalRate: data.total > 0 ? Math.round((data.normal / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [items, points]);

  const pieData = useMemo(() => [
    { name: '正常', value: stats.normal, color: '#22c55e' },
    { name: '异常', value: stats.abnormal, color: '#f59e0b' },
    { name: '容量超限', value: stats.overCapacity, color: '#ef4444' },
    { name: '有投诉', value: stats.complaint, color: '#ec4899' },
  ], [stats]);

  const barData = useMemo(() =>
    streetStats.slice(0, 6).map(s => ({
      name: s.street.length > 8 ? s.street.slice(0, 8) + '...' : s.street,
      正常: s.normal,
      异常: s.abnormal,
    }))
  , [streetStats]);

  const todayProcessed = shiftRecords.filter(r => 
    r.actionType === 'confirm' || r.actionType === 'reject' || r.actionType === 'merge'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <Share2 className="w-8 h-8 text-municipal-500 animate-pulse" />
          <p className="text-gray-500">加载交付视图中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Share2 className="w-7 h-7 text-municipal-500" />
              交付视图
            </h1>
            <p className="mt-1 text-gray-500">一键生成交付材料，报表自动汇总</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-municipal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1.5" />
              总览
            </button>
            <button
              onClick={() => setActiveTab('shift')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'shift'
                  ? 'bg-municipal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1.5" />
              交班清单
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'export'
                  ? 'bg-municipal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Download className="w-4 h-4 inline mr-1.5" />
              导出
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">总点位</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-municipal-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-municipal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">正常</p>
                    <p className="mt-1 text-2xl font-bold text-success-600">{stats.normal}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">异常</p>
                    <p className="mt-1 text-2xl font-bold text-warning-600">{stats.abnormal}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-warning-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">容量超限</p>
                    <p className="mt-1 text-2xl font-bold text-danger-600">{stats.overCapacity}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-danger-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">有投诉</p>
                    <p className="mt-1 text-2xl font-bold text-complaint-600">{stats.complaint}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-complaint-100 flex items-center justify-center">
                    <MessageSquareWarning className="w-5 h-5 text-complaint-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">正常率</p>
                    <p className="mt-1 text-2xl font-bold text-municipal-600">{stats.normalRate}%</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-municipal-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-municipal-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-municipal-500" />
                  状态分布
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-municipal-500" />
                  街口分布（前6名）
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="正常" fill="#22c55e" stackId="a" />
                      <Bar dataKey="异常" fill="#f59e0b" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">街口明细</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">街口</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">总数</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">正常</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">异常</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">正常率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {streetStats.map((street, index) => (
                      <tr key={street.street} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{street.street}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-900 font-medium">{street.total}</td>
                        <td className="px-6 py-4 text-center text-success-600">{street.normal}</td>
                        <td className="px-6 py-4 text-center">
                          {street.abnormal > 0 ? (
                            <span className="text-warning-600">{street.abnormal}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-municipal-500 rounded-full"
                                style={{ width: `${street.normalRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{street.normalRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'shift' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">今日已处理</p>
                    <p className="mt-1 text-3xl font-bold text-municipal-600">{todayProcessed}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-municipal-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-municipal-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">待复核</p>
                    <p className="mt-1 text-3xl font-bold text-warning-600">
                      {items.filter(i => i.status !== 'normal').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-warning-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">待处理投诉</p>
                    <p className="mt-1 text-3xl font-bold text-complaint-600">
                      {records.length === 0 ? 0 : shiftRecords.filter(r => r.actionType === 'merge').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-complaint-100 flex items-center justify-center">
                    <MessageSquareWarning className="w-6 h-6 text-complaint-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">今日操作记录</h3>
              </div>
              {shiftRecords.length === 0 ? (
                <div className="p-12">
                  <Empty
                    icon={<Clock className="w-12 h-12 text-gray-300" />}
                    title="今日暂无操作记录"
                    description="完成复核操作后会自动记录到交班清单"
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {shiftRecords.map((record) => (
                    <div key={record.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {record.actionType === 'confirm' && (
                            <CheckCircle className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
                          )}
                          {record.actionType === 'reject' && (
                            <XCircle className="w-5 h-5 text-danger-500 mt-0.5 flex-shrink-0" />
                          )}
                          {record.actionType === 'merge' && (
                            <Merge className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {record.actionType === 'confirm' && '确认通过'}
                              {record.actionType === 'reject' && '退回重报'}
                              {record.actionType === 'merge' && '归并投诉'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{record.explanation}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(record.createdAt).toLocaleTimeString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={
                          record.actionType === 'confirm' ? 'normal' :
                          record.actionType === 'reject' ? 'incomplete' : 'conflict'
                        } />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'export' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-municipal-100 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-municipal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">导出交付材料</h3>
                <p className="text-gray-500">一键生成完整的交付报告，包含所有数据和分析结果</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">点位数据报告</p>
                      <p className="text-sm text-gray-500">包含所有GIS点位及状态信息</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">.xlsx</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-warning-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">异常清单报告</p>
                      <p className="text-sm text-gray-500">包含所有异常项及处理说明</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">.xlsx</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-complaint-100 flex items-center justify-center">
                      <MessageSquareWarning className="w-5 h-5 text-complaint-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">投诉处理报告</p>
                      <p className="text-sm text-gray-500">包含所有投诉及处理结果</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">.xlsx</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">数据统计报告</p>
                      <p className="text-sm text-gray-500">包含图表和统计分析</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">.pdf</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-municipal-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-municipal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">操作日志报告</p>
                      <p className="text-sm text-gray-500">包含所有操作记录和留痕</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">.xlsx</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => alert('导出功能演示：正在生成报告...')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-municipal-500 hover:bg-municipal-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  导出全部
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}