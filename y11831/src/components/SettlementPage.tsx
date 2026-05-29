import { Trophy, Clock, Users, Database, Navigation, AlertTriangle, CheckCircle, XCircle, RotateCcw, BarChart3 } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SettlementPageProps {
  onRestart: () => void;
  onReview: () => void;
}

export function SettlementPage({ onRestart, onReview }: SettlementPageProps) {
  const { orders, completedOrders, problemOrders, cache, algorithms, getStats } = useGameStore();
  const stats = getStats();

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#7c3aed'];

  const statusData = [
    { name: '完成', value: stats.completedOrders, color: '#22c55e' },
    { name: '超时', value: stats.timeoutOrders, color: '#f59e0b' },
    { name: '饥饿', value: stats.starvedOrders, color: '#ef4444' },
  ];

  const algorithmData = [
    { name: '队列策略', algorithm: algorithms.queue, score: stats.completedOrders / Math.max(stats.totalOrders, 1) * 100 },
    { name: '缓存策略', algorithm: algorithms.cache, score: stats.cacheHitRate * 100 },
    { name: '路径算法', algorithm: algorithms.path, score: stats.pathEfficiency * 100 },
  ];

  const getGrade = (score: number) => {
    if (score >= 800) return { grade: 'S', color: 'text-yellow-500', bg: 'bg-yellow-50' };
    if (score >= 600) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50' };
    if (score >= 400) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (score >= 200) return { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-50' };
  };

  const gradeInfo = getGrade(stats.totalScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-800">游戏结算</h1>
          </div>
          <p className="text-gray-600">算法面试餐厅经营报告</p>
        </div>

        <div className={`${gradeInfo.bg} rounded-2xl p-8 mb-8 text-center shadow-lg`}>
          <div className={`text-8xl font-bold ${gradeInfo.color} mb-4`}>
            {gradeInfo.grade}
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            总分: {stats.totalScore}
          </div>
          <div className="text-gray-600">
            算法选择: {algorithms.queue} + {algorithms.cache} + {algorithms.path}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">总订单数</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalOrders}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">完成订单</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.completedOrders}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm">平均等待</span>
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats.averageWaitTime.toFixed(1)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Database className="w-5 h-5" />
              <span className="text-sm">缓存命中率</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{(stats.cacheHitRate * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              订单状态分布
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-600" />
              算法效率评分
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={algorithmData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="score" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {problemOrders.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-md mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              问题订单 ({problemOrders.length})
            </h3>
            <div className="space-y-3">
              {problemOrders.map((problem, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    problem.severity === 'high'
                      ? 'border-red-300 bg-red-50'
                      : problem.severity === 'medium'
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          problem.type === 'starvation'
                            ? 'bg-red-200 text-red-800'
                            : problem.type === 'path_detour'
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}
                      >
                        {problem.type === 'starvation' ? '订单饥饿' : problem.type === 'path_detour' ? '路径绕远' : '缓存淘汰'}
                      </span>
                      <span className="font-medium text-gray-800">
                        订单 {problem.orderId}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        problem.severity === 'high'
                          ? 'bg-red-500 text-white'
                          : problem.severity === 'medium'
                          ? 'bg-orange-500 text-white'
                          : 'bg-yellow-500 text-white'
                      }`}
                    >
                      {problem.severity === 'high' ? '严重' : problem.severity === 'medium' ? '中等' : '轻微'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{problem.description}</p>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">责任方:</span>
                      <span className="font-medium text-gray-700">{problem.responsible}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">改进建议:</span>
                      <span className="font-medium text-blue-600">{problem.fixSuggestion}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-md mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            完成订单详情
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-600">订单号</th>
                  <th className="text-left py-2 px-3 text-gray-600">顾客</th>
                  <th className="text-left py-2 px-3 text-gray-600">桌号</th>
                  <th className="text-left py-2 px-3 text-gray-600">等待时间</th>
                  <th className="text-left py-2 px-3 text-gray-600">路径效率</th>
                  <th className="text-left py-2 px-3 text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono">{order.id}</td>
                    <td className="py-2 px-3">{order.customerName}</td>
                    <td className="py-2 px-3">{order.tableNumber}</td>
                    <td className="py-2 px-3">{order.waitTime?.toFixed(1) || '-'}</td>
                    <td className="py-2 px-3">
                      {order.optimalDistance && order.pathDistance
                        ? ((order.optimalDistance / order.pathDistance) * 100).toFixed(1) + '%'
                        : '-'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'starved'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status === 'completed' ? '完成' : order.status === 'starved' ? '饥饿' : order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-md"
          >
            <RotateCcw className="w-5 h-5" />
            重新开始
          </button>
          <button
            onClick={onReview}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-md"
          >
            <BarChart3 className="w-5 h-5" />
            查看复盘
          </button>
        </div>
      </div>
    </div>
  );
}
