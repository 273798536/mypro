import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  RefreshCw,
  GitMerge,
  FileCheck,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ListTodo,
} from 'lucide-react'
import { useScoreStore } from '../store/scoreStore'
import {
  formatDate,
  getTaskTypeLabel,
  getTaskStatusLabel,
  getTaskStatusColor,
} from '../utils/helpers'
import type { SyncTask } from '../types'

export default function Tasks() {
  const { tasks, getScoreById } = useScoreStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const getTaskIcon = (type: SyncTask['type']) => {
    const icons = {
      annotation_merge: GitMerge,
      version_check: FileCheck,
      part_alignment: Users,
    }
    return icons[type]
  }

  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">同步任务中心</h1>
            <p className="text-navy-400 mt-1">管理和执行批注合并、版本校验等同步任务</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 rounded-lg text-navy-900 font-medium hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20">
            <Play className="w-4 h-4" />
            新建任务
          </button>
        </div>

        {/* 任务统计 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            {
              label: '全部任务',
              count: tasks.length,
              icon: ListTodo,
              color: 'text-gold-400',
              bg: 'bg-gold-500/10',
            },
            {
              label: '执行中',
              count: tasks.filter((t) => t.status === 'running').length,
              icon: RefreshCw,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              label: '已完成',
              count: tasks.filter((t) => t.status === 'completed').length,
              icon: CheckCircle,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
            {
              label: '失败',
              count: tasks.filter((t) => t.status === 'failed').length,
              icon: XCircle,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
            },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="bg-navy-800/50 rounded-xl p-5 border border-navy-700/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-navy-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.count}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 任务列表 */}
        <div className="space-y-4">
          {sortedTasks.map((task) => {
            const score = getScoreById(task.scoreId)
            const TaskIcon = getTaskIcon(task.type)
            const isExpanded = expandedId === task.id

            return (
              <div
                key={task.id}
                className="bg-navy-800/50 rounded-xl border border-navy-700/50 overflow-hidden hover:border-gold-500/30 transition-colors"
              >
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          task.status === 'running'
                            ? 'bg-blue-500/20 pulse-border'
                            : task.status === 'completed'
                            ? 'bg-emerald-500/20'
                            : task.status === 'failed'
                            ? 'bg-red-500/20'
                            : 'bg-navy-700/50'
                        }`}
                      >
                        <TaskIcon
                          className={`w-6 h-6 ${
                            task.status === 'running'
                              ? 'text-blue-400 animate-spin'
                              : task.status === 'completed'
                              ? 'text-emerald-400'
                              : task.status === 'failed'
                              ? 'text-red-400'
                              : 'text-navy-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">
                            {getTaskTypeLabel(task.type)}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${getTaskStatusColor(
                              task.status
                            )}`}
                          >
                            {getTaskStatusLabel(task.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {score && (
                            <Link
                              to={`/score/${score.id}`}
                              className="text-sm text-gold-400 hover:text-gold-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {score.title}
                            </Link>
                          )}
                          <span className="text-sm text-navy-500">|</span>
                          <span className="text-sm text-navy-400">
                            {formatDate(task.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* 进度条 */}
                      <div className="w-40">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-navy-400">进度</span>
                          <span className="text-white">{task.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-navy-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              task.status === 'completed'
                                ? 'bg-emerald-500'
                                : task.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-gold-500'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-navy-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-navy-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 展开的日志 */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-navy-700/50">
                    <div className="pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-gold-400" />
                        <span className="text-sm font-medium text-white">执行日志</span>
                      </div>
                      <div className="bg-navy-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <div className="space-y-2">
                          {task.log.map((log, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <span className="text-gold-400 mt-0.5">›</span>
                              <span className="text-sm text-navy-300">{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-3 mt-4">
                      {task.status === 'failed' && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">
                          <RefreshCw className="w-4 h-4" />
                          重试
                        </button>
                      )}
                      {task.status === 'pending' && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30 transition-colors">
                          <Play className="w-4 h-4" />
                          启动
                        </button>
                      )}
                      {task.status === 'running' && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                          <XCircle className="w-4 h-4" />
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {tasks.length === 0 && (
            <div className="bg-navy-800/50 rounded-xl p-12 text-center border border-navy-700/50">
              <ListTodo className="w-16 h-16 mx-auto text-navy-600 mb-4" />
              <p className="text-navy-400">暂无同步任务</p>
              <p className="text-sm text-navy-500 mt-1">点击新建任务开始同步</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
