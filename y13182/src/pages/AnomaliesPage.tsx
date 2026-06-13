import AnomalyList from '@/components/AnomalyList'
import ConsistencyIndicator from '@/components/ConsistencyIndicator'

export default function AnomaliesPage() {
  return (
    <div
      className="mx-auto max-w-4xl overflow-y-auto p-6"
      style={{ background: '#0f172a', minHeight: 'calc(100vh - 3.5rem)' }}
    >
      <div className="mb-6">
        <h1
          className="text-xl font-bold text-slate-200"
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          异常队列
        </h1>
        <p
          className="mt-1 text-sm text-slate-500"
          style={{ fontFamily: '"Noto Sans SC", sans-serif' }}
        >
          安全阈值变更、参数超限和后补备注修正记录。点击条目展开中间计算过程。
        </p>
      </div>

      <div className="mb-6">
        <ConsistencyIndicator />
      </div>

      <AnomalyList />
    </div>
  )
}
