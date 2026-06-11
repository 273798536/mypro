import ProgressBoard from '@/components/overview/ProgressBoard'
import AnomalyChart from '@/components/overview/AnomalyChart'
import TodoList from '@/components/overview/TodoList'
import QuickEntry from '@/components/overview/QuickEntry'

function Overview() {
  return (
    <div className="max-w-[1440px] mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">医院物流机器人空间复核</h1>
        <p className="text-sm text-neutral-500">复核总览 · 处理进度、异常分布与待办清单</p>
      </div>

      <ProgressBoard />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <AnomalyChart />
        </div>
        <div className="lg:col-span-2">
          <TodoList />
        </div>
      </div>

      <QuickEntry />
    </div>
  )
}

export default Overview
