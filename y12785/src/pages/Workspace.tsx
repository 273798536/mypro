import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ListTodo, ShieldAlert } from 'lucide-react'
import { useAppStore, Batch, SafetyHintItem } from '@/store'
import BatchCard from '@/components/BatchCard'
import Timeline, { TimelineEntry } from '@/components/Timeline'
import SafetyHint from '@/components/SafetyHint'
import { fetchApi, fromSnakeData } from '@/lib/utils'

export default function Workspace() {
  const { batches, setBatches, safetyHints, setSafetyHints, addToast } = useAppStore()
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchApi<{ items: any[]; total: number }>('/api/batches')
      .then((res) => {
        const items = fromSnakeData<Batch[]>(res.items || [])
        setBatches(items)
      })
      .catch(() => {})
  }, [setBatches])

  useEffect(() => {
    if (batches.length === 0) return
    const first = batches[0]
    fetchApi<{ items: any[] }>(`/api/batches/${first.id}/logs`)
      .then((res) => {
        setTimeline(fromSnakeData<TimelineEntry[]>(res.items || []))
      })
      .catch(() => {})

    fetchApi<any[]>(`/api/batches/${first.id}/attributions`)
      .then((res) => {
        const attrs = fromSnakeData<any[]>(res)
        const hints: SafetyHintItem[] = attrs
          .filter((a: any) => a.safetyHint)
          .map((a: any, i: number) => ({
            id: `hint-${first.id}-${i}`,
            batchId: first.id,
            content: a.safetyHint,
            sourceMaterial: a.sourceMaterial || '',
          }))
        setSafetyHints(hints)
      })
      .catch(() => {})
  }, [batches, setSafetyHints])

  const pendingTasks = batches.filter(
    (b) => b.status === 'imported' || b.status === 'pending_review'
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-indigo-900">
          工作台
        </h2>
        <p className="text-sm text-cool-gray mt-1">批次总览与待处理任务</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-indigo-900" />
              <h3 className="font-serif text-lg font-semibold text-indigo-900">
                批次总览
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {batches.map((batch) => (
                <BatchCard
                  key={batch.id}
                  batch={batch}
                  onClick={(id) => navigate(`/attribution/${id}`)}
                />
              ))}
              {batches.length === 0 && (
                <div className="col-span-full text-center py-12 text-cool-gray text-sm">
                  暂无批次，请先导入谱图数据
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <ListTodo size={18} className="text-indigo-900" />
              <h3 className="font-serif text-lg font-semibold text-indigo-900">
                待处理任务
              </h3>
            </div>
            <div className="bg-white rounded-lg border border-gray-200">
              {pendingTasks.length === 0 ? (
                <div className="px-4 py-8 text-center text-cool-gray text-sm">
                  当前无待处理任务
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {pendingTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/attribution/${task.id}`)}
                    >
                      <div>
                        <span className="text-sm font-medium text-indigo-900">
                          {task.batchNo}
                        </span>
                        <span className="ml-2 text-xs text-cool-gray">
                          {task.status === 'imported' ? '待分析' : '待复核'}
                        </span>
                      </div>
                      <span className="text-xs text-cool-gray">
                        {new Date(task.updatedAt).toLocaleDateString('zh-CN')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-serif text-lg font-semibold text-indigo-900 mb-4">
              操作日志
            </h3>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {timeline.length === 0 ? (
                <div className="text-center py-6 text-cool-gray text-sm">
                  暂无操作记录
                </div>
              ) : (
                <Timeline entries={timeline} />
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} className="text-amber-500" />
              <h3 className="font-serif text-lg font-semibold text-indigo-900">
                安全提示
              </h3>
            </div>
            <SafetyHint hints={safetyHints} />
            {safetyHints.length === 0 && (
              <div className="text-sm text-cool-gray text-center py-6">
                暂无安全提示
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
