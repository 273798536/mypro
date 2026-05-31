import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { groups } from '../services/api'
import type { GroupStats as GroupStatsType } from '../../../shared/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Users, GraduationCap, Calendar, Clock, ChevronRight } from 'lucide-react'

const GROUP_TABS = [
  { key: 'teacher', label: '按教师', icon: Users, param: 'teacherId' },
  { key: 'course', label: '按课程', icon: GraduationCap, param: 'courseType' },
  { key: 'age', label: '按年龄', icon: Calendar, param: 'age' },
  { key: 'renewal', label: '按续费周期', icon: Clock, param: 'renewalPeriod' },
]

const COLORS = {
  red: '#ef4444',
  yellow: '#f59e0b',
  green: '#22c55e',
  primary: '#3b82f6',
}

const GroupStats: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('teacher')
  const [statsData, setStatsData] = useState<GroupStatsType[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadGroupStats()
  }, [activeTab])

  const loadGroupStats = async () => {
    setLoading(true)
    try {
      const data = await groups.getStats({ groupBy: activeTab })
      setStatsData(data)
    } catch (error) {
      console.error('加载分组统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (group: GroupStatsType) => {
    const tab = GROUP_TABS.find(t => t.key === activeTab)
    if (tab) {
      navigate(`/students?${tab.param}=${encodeURIComponent(group.groupKey)}`)
    }
  }

  const calculateAvgScore = (item: GroupStatsType) => {
    const weightedScore = (item.redRate * 80) + (item.yellowRate * 45) + (item.greenRate * 20)
    return Math.round(weightedScore)
  }

  const chartData = statsData.map(item => ({
    name: item.groupName.length > 6 ? item.groupName.substring(0, 6) + '...' : item.groupName,
    fullName: item.groupName,
    avgScore: calculateAvgScore(item),
    red: Math.round(item.studentCount * item.redRate),
    yellow: Math.round(item.studentCount * item.yellowRate),
    green: Math.round(item.studentCount * item.greenRate),
  }))

  const getBarColor = (score: number) => {
    if (score >= 60) return COLORS.red
    if (score >= 35) return COLORS.yellow
    return COLORS.green
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">分组指标</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex border-b border-slate-200">
          {GROUP_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary bg-blue-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">平均分对比</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => [`${value}分`, '平均分']}
                        labelFormatter={(label, payload) => {
                          if (payload && payload.length > 0) {
                            return (payload[0].payload as any).fullName
                          }
                          return label as string
                        }}
                      />
                      <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.avgScore)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">分组详情</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">分组名称</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">学员数</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">平均分</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">红色预警</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">黄色预警</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">绿色预警</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {statsData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">暂无数据</td>
                        </tr>
                      ) : (
                        statsData.map((item) => {
                          const avgScore = calculateAvgScore(item)
                          const redCount = Math.round(item.studentCount * item.redRate)
                          const yellowCount = Math.round(item.studentCount * item.yellowRate)
                          const greenCount = Math.round(item.studentCount * item.greenRate)

                          return (
                            <tr 
                              key={item.groupKey} 
                              className="hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => handleRowClick(item)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium text-slate-800">{item.groupName}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {item.studentCount} 人
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  avgScore >= 60 ? 'bg-red-100 text-red-700' :
                                  avgScore >= 35 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {avgScore} 分
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  <span className="text-sm text-slate-600">{redCount} 人</span>
                                  <span className="text-xs text-slate-400">({(item.redRate * 100).toFixed(0)}%)</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                  <span className="text-sm text-slate-600">{yellowCount} 人</span>
                                  <span className="text-xs text-slate-400">({(item.yellowRate * 100).toFixed(0)}%)</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  <span className="text-sm text-slate-600">{greenCount} 人</span>
                                  <span className="text-xs text-slate-400">({(item.greenRate * 100).toFixed(0)}%)</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button className="inline-flex items-center gap-1 text-primary hover:text-blue-700 text-sm font-medium">
                                  查看学员
                                  <ChevronRight size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GroupStats
