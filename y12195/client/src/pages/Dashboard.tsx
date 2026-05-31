import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { warnings } from '../services/api'
import type { DashboardStats, WarningLevel } from '../../../shared/types'
import ScoreBadge from '../components/ScoreBadge'

const getLevelText = (level: WarningLevel) => {
  switch (level) {
    case 'red': return '红色预警'
    case 'yellow': return '黄色预警'
    case 'green': return '绿色预警'
    default: return level
  }
}

const getLevelColor = (level: WarningLevel) => {
  switch (level) {
    case 'red': return 'text-red-600 bg-red-50'
    case 'yellow': return 'text-amber-600 bg-amber-50'
    case 'green': return 'text-green-600 bg-green-50'
    default: return 'text-slate-600 bg-slate-50'
  }
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await warnings.getDashboard()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载数据失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const avgScore = data
    ? Math.round((data.redCount * 70 + data.yellowCount * 45 + data.greenCount * 20) / data.totalStudents)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
        {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 text-primary hover:underline"
        >
          重试
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">预警仪表盘</h2>
        <div className="text-sm text-slate-500">
          共 {data.totalStudents} 名学员
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">红色预警</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{data.redCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔴</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">黄色预警</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{data.yellowCount}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🟡</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">绿色预警</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{data.greenCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🟢</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">平均评分</p>
              <p className="text-3xl font-bold text-primary mt-1">{avgScore}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {data.pendingMakeups > 0 && (
        <div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/makeup')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="font-medium text-amber-800">待处理缺课补录</p>
                <p className="text-sm text-amber-600">您有 {data.pendingMakeups} 条缺课记录需要处理</p>
              </div>
            </div>
            <span className="text-amber-600 hover:underline">去处理 →</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">风险趋势（最近7天）</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="red"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', r: 4 }}
                  name="红色预警"
                />
                <Line
                  type="monotone"
                  dataKey="yellow"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="黄色预警"
                />
                <Line
                  type="monotone"
                  dataKey="green"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', r: 4 }}
                  name="绿色预警"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">高风险教师 TOP3</h3>
          <div className="space-y-4">
            {[
              { rank: 1, name: '张老师', count: 8, avgScore: 68 },
              { rank: 2, name: '李老师', count: 6, avgScore: 62 },
              { rank: 3, name: '王老师', count: 5, avgScore: 58 },
            ].map((teacher) => (
              <div
                key={teacher.rank}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      teacher.rank === 1
                        ? 'bg-amber-100 text-amber-600'
                        : teacher.rank === 2
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {teacher.rank}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{teacher.name}</p>
                    <p className="text-sm text-slate-500">高风险学员 {teacher.count} 人</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{teacher.avgScore}</p>
                  <p className="text-xs text-slate-500">平均风险分</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">高风险学员 TOP10</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  排名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  学员
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  风险评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  预警等级
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  上次跟进
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  风险归因
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.topRiskStudents.map((student, index) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/students/${student.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index < 3
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ScoreBadge score={student.score} level={getLevelText(student.level)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(
                        student.level
                      )}`}
                    >
                      {getLevelText(student.level)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(student.lastFollowUp).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {student.attribution.slice(0, 3).map((attr, i) => (
                        <span
                          key={i}
                          className="inline-flex px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                        >
                          {attr}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <span className="text-primary hover:text-blue-700">查看详情 →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
