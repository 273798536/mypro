import type { CorrelationEntry } from '@/types'
import { Link2, ExternalLink } from 'lucide-react'

interface Props {
  chain: CorrelationEntry[]
  onJumpToCustomer?: (customerId: string) => void
}

const statusLabel: Record<string, string> = {
  waiting: '等待中',
  serving: '服务中',
  completed: '已完成',
  no_show: '爽约',
  abandoned: '放弃',
}

const statusColor: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-700',
  serving: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  abandoned: 'bg-gray-100 text-gray-600',
}

export default function CorrelationTable({ chain, onJumpToCustomer }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={16} className="text-milk-400" />
        <h3 className="font-bold text-milk-700 text-sm">详情关联链</h3>
        <span className="text-xs text-milk-400">顾客卡 ↔ 窗口 ↔ 报告条目</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-milk-200">
              <th className="text-left py-2 px-2 text-milk-500 font-medium">顾客卡ID</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">预约号</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">窗口</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">报告索引</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">到达</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">时长</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">状态</th>
              <th className="text-left py-2 px-2 text-milk-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {chain.map((entry) => (
              <tr key={entry.customerId} className="border-b border-milk-100 hover:bg-milk-50 transition-colors">
                <td className="py-1.5 px-2 font-mono text-milk-600">{entry.customerId.slice(0, 10)}</td>
                <td className="py-1.5 px-2 font-bold text-milk-700">{entry.appointmentNo}</td>
                <td className="py-1.5 px-2">
                  {entry.windowId !== null ? (
                    <span className="bg-milk-100 px-1.5 py-0.5 rounded text-milk-700">
                      窗口{entry.windowId + 1}
                    </span>
                  ) : (
                    <span className="text-milk-300">—</span>
                  )}
                </td>
                <td className="py-1.5 px-2 font-mono text-milk-500">#{entry.reportItemIndex}</td>
                <td className="py-1.5 px-2 text-milk-500">T{entry.arrivalTime}</td>
                <td className="py-1.5 px-2 text-milk-500">{entry.serviceDuration}</td>
                <td className="py-1.5 px-2">
                  <span className={`px-1.5 py-0.5 rounded-full ${statusColor[entry.status] ?? 'bg-gray-100'}`}>
                    {statusLabel[entry.status] ?? entry.status}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  {onJumpToCustomer && (
                    <button
                      onClick={() => onJumpToCustomer(entry.customerId)}
                      className="text-milk-400 hover:text-milk-600 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
