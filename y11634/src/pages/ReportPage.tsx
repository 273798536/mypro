import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useGameStore } from '../store/useGameStore'
import { ArrowLeft, Trophy, Clock, Gem, AlertTriangle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'

const ReportPage = () => {
  const navigate = useNavigate()
  const {
    score,
    time,
    ore,
    targetOre,
    endReason,
    scoreHistory,
    operationHistory,
    events,
    resetGame,
  } = useGameStore()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const scoreChartData = scoreHistory.map((entry) => ({
    time: formatTime(entry.time),
    score: entry.amount,
    cumulative: scoreHistory
      .filter((e) => e.time <= entry.time)
      .reduce((sum, e) => sum + e.amount, 0),
  }))

  const scoreByCategory = [
    {
      name: '运送得分',
      value: scoreHistory.filter((e) => e.category === 'delivery').reduce((sum, e) => sum + e.amount, 0),
      color: '#2ed573',
    },
    {
      name: '效率奖励',
      value: scoreHistory.filter((e) => e.category === 'efficiency').reduce((sum, e) => sum + e.amount, 0),
      color: '#00d4ff',
    },
    {
      name: '额外奖励',
      value: scoreHistory.filter((e) => e.category === 'bonus').reduce((sum, e) => sum + e.amount, 0),
      color: '#7c3aed',
    },
    {
      name: '扣分',
      value: scoreHistory.filter((e) => e.category === 'penalty').reduce((sum, e) => sum + e.amount, 0),
      color: '#ff4757',
    },
  ].filter((item) => item.value !== 0)

  const eventChartData = events.reduce((acc: { type: string; count: number }[], event) => {
    const existing = acc.find((item) => item.type === event.type)
    if (existing) {
      existing.count++
    } else {
      acc.push({ type: event.type, count: 1 })
    }
    return acc
  }, [])

  const getEndReasonIcon = () => {
    switch (endReason) {
      case '任务完成':
        return <CheckCircle className="w-12 h-12 text-green-400" />
      case '矿车碰撞':
      case '能量耗尽':
        return <XCircle className="w-12 h-12 text-red-400" />
      default:
        return <AlertTriangle className="w-12 h-12 text-yellow-400" />
    }
  }

  const getEndReasonColor = () => {
    switch (endReason) {
      case '任务完成':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/50'
      case '矿车碰撞':
      case '能量耗尽':
        return 'from-red-500/20 to-rose-500/20 border-red-500/50'
      default:
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回游戏
          </button>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            运输报告
          </h1>
          <button
            onClick={() => {
              resetGame()
              navigate('/')
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            新游戏
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-slate-400">最终得分</span>
            </div>
            <p className="text-3xl font-bold text-white">{score}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-cyan-400" />
              <span className="text-slate-400">游戏时长</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatTime(time)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Gem className="w-6 h-6 text-orange-400" />
              <span className="text-slate-400">运送矿石</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {ore}/{targetOre}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`bg-gradient-to-br ${getEndReasonColor()} backdrop-blur-sm rounded-xl p-6 border`}
          >
            <div className="flex items-center gap-3 mb-2">
              {getEndReasonIcon()}
              <span className="text-slate-400">结束原因</span>
            </div>
            <p className="text-xl font-bold text-white">{endReason || '未知'}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30"
          >
            <h3 className="text-lg font-bold text-cyan-400 mb-4">得分趋势</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#00d4ff"
                    strokeWidth={2}
                    name="累计得分"
                    dot={{ fill: '#00d4ff', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30"
          >
            <h3 className="text-lg font-bold text-cyan-400 mb-4">得分分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={scoreByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {scoreByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {eventChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 mb-8"
          >
            <h3 className="text-lg font-bold text-cyan-400 mb-4">事件统计</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 mb-8"
        >
          <h3 className="text-lg font-bold text-cyan-400 mb-4">操作历史</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {operationHistory.length === 0 ? (
              <p className="text-slate-500 text-center py-8">暂无操作记录</p>
            ) : (
              operationHistory.map((record) => (
                <div
                  key={record.id}
                  className={`flex items-start gap-4 p-3 rounded-lg ${
                    record.result === 'success'
                      ? 'bg-green-900/20 border border-green-500/30'
                      : 'bg-red-900/20 border border-red-500/30'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      record.result === 'success' ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">{record.message}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {formatTime(record.time)} · {record.type}
                      {record.scoreChange !== 0 && (
                        <span
                          className={`ml-2 ${
                            record.scoreChange > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {record.scoreChange > 0 ? '+' : ''}
                          {record.scoreChange} 分
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30"
        >
          <h3 className="text-lg font-bold text-cyan-400 mb-4">得分明细</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">时间</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">原因</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">类别</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">分数</th>
                </tr>
              </thead>
              <tbody>
                {scoreHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">
                      暂无得分记录
                    </td>
                  </tr>
                ) : (
                  scoreHistory.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 px-4 text-white">{formatTime(entry.time)}</td>
                      <td className="py-3 px-4 text-white">{entry.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            entry.category === 'delivery'
                              ? 'bg-green-900/50 text-green-400'
                              : entry.category === 'efficiency'
                              ? 'bg-cyan-900/50 text-cyan-400'
                              : entry.category === 'bonus'
                              ? 'bg-purple-900/50 text-purple-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}
                        >
                          {entry.category === 'delivery'
                            ? '运送'
                            : entry.category === 'efficiency'
                            ? '效率'
                            : entry.category === 'bonus'
                            ? '奖励'
                            : '扣分'}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold ${
                          entry.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {entry.amount > 0 ? '+' : ''}
                        {entry.amount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ReportPage
