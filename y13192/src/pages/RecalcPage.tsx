import ParamPanel from '@/components/ParamPanel'
import CompareReport from '@/components/CompareReport'
import BoundarySamples from '@/components/BoundarySamples'
import { Calculator } from 'lucide-react'

export default function RecalcPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-gray-800 px-6 py-3" style={{ background: '#1a1a2e' }}>
        <Calculator className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="text-lg font-bold text-white">参数复算</h1>
          <p className="text-xs text-gray-500">调整阈值参数 → 一键复算 → 查看公式/单位/边界变化原因</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 overflow-auto border-r border-gray-800 p-4">
          <ParamPanel />
        </aside>
        <div className="flex-1 overflow-auto p-6 space-y-6" style={{ background: '#0f0f23' }}>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">调参前后对比报告</h2>
            <CompareReport />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-amber-400">边界样本明细</h2>
            <BoundarySamples />
          </section>
        </div>
      </div>
    </div>
  )
}
