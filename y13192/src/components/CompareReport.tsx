import { useStore } from '@/store/useStore'
import { ArrowRight, AlertCircle } from 'lucide-react'

const reasonMap: Record<string, string> = {
  formula: '公式变更',
  unit: '单位换算',
  boundary: '边界调整',
}

export default function CompareReport() {
  const recalcResults = useStore((s) => s.recalcResults)

  const filtered = recalcResults.filter(
    (r) => r.crossedBoundary || r.beforeAnomaly !== r.afterAnomaly
  )

  if (recalcResults.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 rounded-xl border border-gray-700"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        <AlertCircle className="w-8 h-8 text-gray-500 mb-2" />
        <p className="text-gray-500 text-sm">请先点击复算</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-700"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-gray-400 font-medium">Cell</th>
            <th className="px-4 py-3 text-center text-gray-400 font-medium">调参前</th>
            <th className="px-4 py-3 text-center text-gray-400 font-medium" />
            <th className="px-4 py-3 text-center text-gray-400 font-medium">调参后</th>
            <th className="px-4 py-3 text-center text-gray-400 font-medium">异常</th>
            <th className="px-4 py-3 text-right text-gray-400 font-medium">原因</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr
              key={r.cellId}
              className={`border-b border-gray-700/50 transition-colors ${
                r.crossedBoundary ? 'bg-amber-500/15' : ''
              }`}
            >
              <td className="px-4 py-3 text-gray-300 font-medium">{r.cellId}</td>
              <td className="px-4 py-3 text-center text-gray-200 font-mono">
                {r.beforeValue}
              </td>
              <td className="px-4 py-3 text-center">
                <ArrowRight className="inline-block w-4 h-4 text-gray-500" />
              </td>
              <td className="px-4 py-3 text-center font-mono text-white">
                {r.afterValue}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    r.afterAnomaly
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {r.beforeAnomaly ? '异常' : '正常'}
                  <ArrowRight className="w-3 h-3" />
                  {r.afterAnomaly ? '异常' : '正常'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {r.changeReason && (
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.2)',
                      color: '#f59e0b',
                    }}
                  >
                    {reasonMap[r.changeReason]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
          无变更记录
        </div>
      )}
    </div>
  )
}
