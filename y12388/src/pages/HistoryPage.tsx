import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  User,
  Edit3,
  FileText,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card } from '@/components/Card'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDateTime, formatRelativeTime } from '@/utils/format'
import { cn } from '@/lib/utils'
import { RegistrationStatus } from '@/types'

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>()
  const {
    currentRegistration,
    currentHistory,
    currentSnapshots,
    loadRegistrationDetail,
    clearCurrent,
  } = useAppStore()

  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadRegistrationDetail(id)
    }
    return () => clearCurrent()
  }, [id])

  const getActionIcon = (action: string) => {
    if (action.includes('状态') || action.includes('审核')) return Edit3
    if (action.includes('备注') || action.includes('说明')) return FileText
    if (action.includes('提交') || action.includes('创建')) return FileText
    if (action.includes('快照') || action.includes('版本')) return Camera
    return Clock
  }

  const getActionColor = (action: string) => {
    if (action.includes('通过') || action.includes('完成')) return 'text-green-600 bg-green-100'
    if (action.includes('驳回') || action.includes('拒绝')) return 'text-red-600 bg-red-100'
    if (action.includes('异常') || action.includes('不符') || action.includes('缺失')) return 'text-orange-600 bg-orange-100'
    if (action.includes('备注')) return 'text-amber-600 bg-amber-100'
    return 'text-blue-600 bg-blue-100'
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4">
        <Link
          to={id ? `/registration/${id}` : '/'}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-800">
            历史记录
          </h1>
          <p className="text-slate-500">
            {currentRegistration
              ? `${currentRegistration.studentName} · ${currentRegistration.examLevel}级`
              : '操作历史与版本快照'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 操作历史 */}
        <div className="col-span-2">
          <Card title="操作历史" subtitle="完整记录所有操作痕迹，可追溯可审计">
            {currentHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无操作记录</p>
              </div>
            ) : (
              <div className="relative">
                {/* 时间线 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                <div className="space-y-6">
                  {currentHistory.map((record, index) => {
                    const Icon = getActionIcon(record.action)
                    const colorClass = getActionColor(record.action)

                    return (
                      <div key={record.id} className="relative pl-12">
                        {/* 时间点 */}
                        <div
                          className={cn(
                            'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                            colorClass
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* 内容卡片 */}
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-slate-900">{record.action}</h4>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                <User className="w-3.5 h-3.5" />
                                <span>{record.operator}</span>
                                <span>·</span>
                                <span>{formatDateTime(record.createdAt)}</span>
                                <span className="text-slate-400">
                                  ({formatRelativeTime(record.createdAt)})
                                </span>
                              </div>
                            </div>
                          </div>

                          {record.oldValue && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500">变更前：</span>
                                  <p className="text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                                    {record.oldValue}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">变更后：</span>
                                  <p className="text-green-600 mt-1 bg-green-50 px-2 py-1 rounded">
                                    {record.newValue}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {!record.oldValue && record.newValue && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-sm text-slate-600">{record.newValue}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 版本快照 */}
        <div>
          <Card title="版本快照" subtitle="每次修改自动保存，防止数据被覆盖">
            {currentSnapshots.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Camera className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无版本快照</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentSnapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={cn(
                      'border rounded-lg overflow-hidden transition-colors',
                      expandedSnapshot === snapshot.id
                        ? 'border-primary-300'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <button
                      onClick={() =>
                        setExpandedSnapshot(
                          expandedSnapshot === snapshot.id ? null : snapshot.id
                        )
                      }
                      className="w-full p-4 text-left flex items-start justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-mono rounded">
                            v{snapshot.version}
                          </span>
                          <span className="font-medium text-slate-900 text-sm">
                            {snapshot.reason}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDateTime(snapshot.createdAt)}
                        </p>
                      </div>
                      {expandedSnapshot === snapshot.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {expandedSnapshot === snapshot.id && (
                      <div className="px-4 pb-4 border-t border-slate-100">
                        <div className="pt-3 space-y-2 text-sm">
                          <div>
                            <span className="text-slate-500">学生姓名：</span>
                            <span className="text-slate-700">
                              {(snapshot.data.registration as { studentName?: string })?.studentName}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">报名状态：</span>
                            <span className="text-slate-700">
                              {(snapshot.data.registration as { status?: RegistrationStatus })?.status && (
                                <StatusBadge
                                  status={(snapshot.data.registration as { status: RegistrationStatus }).status}
                                  size="sm"
                                />
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">材料数：</span>
                            <span className="text-slate-700">
                              {(snapshot.data.materials as unknown[] | undefined)?.length || 0} 份
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">曲目数：</span>
                            <span className="text-slate-700">
                              {((snapshot.data.repertoires as unknown[] | undefined)?.length || 0) / 2} 首
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">证件数：</span>
                            <span className="text-slate-700">
                              {(snapshot.data.documents as unknown[] | undefined)?.length || 0} 份
                            </span>
                          </div>
                          {(snapshot.data.teacherNotes as unknown[] | undefined)?.length && (snapshot.data.teacherNotes as unknown[]).length > 0 && (
                            <div>
                              <span className="text-slate-500">老师备注：</span>
                              <span className="text-slate-700">
                                {(snapshot.data.teacherNotes as unknown[]).length} 条
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 说明卡片 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">关于证据保留</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 每次状态变更自动创建版本快照</li>
              <li>• 历史记录不可删除，确保审计可追溯</li>
              <li>• 证件缺失时保存快照防止新版本覆盖</li>
              <li>• 老师备注作为补充证据永久保留</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
