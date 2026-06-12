import { useStore } from '@/store'
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  MinusCircle,
  ArrowRight,
} from 'lucide-react'

export default function NameplatePage() {
  const { data, highlightedRow, setHighlightedRow, setActiveTab } = useStore()

  const getAlarmBadge = (flag: string) => {
    switch (flag) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-status-red/20 text-status-red text-xs font-mono rounded border border-status-red/30">
            <ArrowRight className="w-3 h-3" /> HIGH
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-status-yellow/20 text-status-yellow text-xs font-mono rounded border border-status-yellow/30">
            ↓ LOW
          </span>
        )
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-status-red/30 text-status-red text-xs font-mono rounded border border-status-red/50">
            <XCircle className="w-3 h-3" /> ERROR
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-industrial-800 text-industrial-600 text-xs font-mono rounded">
            — OK
          </span>
        )
    }
  }

  const getRemarkStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle2 className="w-4 h-4 text-status-green" />
      case 'mismatched':
        return <AlertTriangle className="w-4 h-4 text-warning-500" />
      case 'missing':
        return <MinusCircle className="w-4 h-4 text-industrial-600" />
      default:
        return null
    }
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            设备铭牌 / NAMEPLATE
          </h2>
          <p className="text-sm text-industrial-600 mt-1 font-mono">
            原始数据行 · 报警与备注关联 · 坏数据定位
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono text-industrial-600">
          <Legend color="bg-error-stripe" label="坏数据" />
          <Legend color="bg-status-green" label="备注对齐" />
          <Legend color="bg-warning-500" label="备注未对齐" />
          <Legend color="bg-industrial-600" label="备注缺失" />
        </div>
      </header>

      <div className="bg-industrial-900/50 border border-grid-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-industrial-800 text-left">
                <th className="sticky left-0 z-10 bg-industrial-800 px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider w-16">
                  行号
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider">
                  设备编号
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider">
                  参数名称
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider text-right">
                  参数值
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider">
                  单位
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider">
                  报警
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider">
                  人工备注
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider text-center">
                  对齐
                </th>
                <th className="px-4 py-3 font-display text-xs text-industrial-600 uppercase tracking-wider">
                  数据质量
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.nameplate.map((row) => (
                <tr
                  key={row.row_no}
                  onClick={() => {
                    setHighlightedRow(row.row_no)
                    if (row.bad_data_flag) {
                      setActiveTab('anomaly')
                    }
                  }}
                  className={`row-zebra cursor-pointer transition-colors ${
                    highlightedRow === row.row_no
                      ? '!bg-status-green/10 !border-l-4 !border-l-status-green'
                      : ''
                  } ${
                    row.bad_data_flag
                      ? 'bg-error-stripe hover:bg-error-stripe'
                      : 'hover:bg-industrial-700/30'
                  }`}
                >
                  <td className="sticky left-0 bg-inherit px-4 py-3 font-mono text-sm text-warning-500 font-bold border-r border-grid-line">
                    #{row.row_no.toString().padStart(3, '0')}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-white">
                    {row.device_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-white">
                    {row.param_name}
                  </td>
                  <td
                    className={`px-4 py-3 font-mono text-sm text-right ${
                      row.bad_data_flag ? 'text-status-red line-through' : 'text-white'
                    }`}
                  >
                    {row.bad_data_flag
                      ? row.param_value.toExponential(2)
                      : row.param_value.toFixed(row.param_value < 10 ? 3 : 1)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-industrial-600">
                    {row.unit}
                  </td>
                  <td className="px-4 py-3">{getAlarmBadge(row.alarm_flag)}</td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {row.remark ? (
                      <span className="text-white">{row.remark}</span>
                    ) : (
                      <span className="text-industrial-600 italic">— 空 —</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getRemarkStatusIcon(row.remark_status)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.bad_data_flag ? (
                      <div className="flex items-center gap-2 text-status-red">
                        <XCircle className="w-4 h-4" />
                        <span>{row.bad_data_reason}</span>
                      </div>
                    ) : (
                      <span className="text-industrial-600">正常</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-industrial-900/50 border border-grid-line rounded p-4">
          <p className="font-display text-xs text-industrial-600 uppercase tracking-wider mb-1">
            总记录
          </p>
          <p className="font-display text-2xl font-bold text-white">
            {data?.nameplate.length || 0}
          </p>
        </div>
        <div className="bg-industrial-900/50 border border-grid-line rounded p-4">
          <p className="font-display text-xs text-industrial-600 uppercase tracking-wider mb-1">
            备注已对齐
          </p>
          <p className="font-display text-2xl font-bold text-status-green">
            {data?.nameplate.filter((r) => r.remark_status === 'matched').length || 0}
          </p>
        </div>
        <div className="bg-industrial-900/50 border border-grid-line rounded p-4">
          <p className="font-display text-xs text-industrial-600 uppercase tracking-wider mb-1">
            备注待核实
          </p>
          <p className="font-display text-2xl font-bold text-warning-500">
            {data?.nameplate.filter((r) => r.remark_status === 'mismatched').length || 0}
          </p>
        </div>
        <div className="bg-industrial-900/50 border border-grid-line rounded p-4">
          <p className="font-display text-xs text-industrial-600 uppercase tracking-wider mb-1">
            坏数据
          </p>
          <p className="font-display text-2xl font-bold text-status-red">
            {data?.nameplate.filter((r) => r.bad_data_flag).length || 0}
          </p>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  )
}
