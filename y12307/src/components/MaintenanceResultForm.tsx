import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

export default function MaintenanceResultForm() {
  const addMaintenance = useBayesianStore(s => s.addMaintenance)
  const alarms = useBayesianStore(s => s.alarms)
  const maintenances = useBayesianStore(s => s.maintenances)
  const removeMaintenance = useBayesianStore(s => s.removeMaintenance)

  const [relatedAlarmIds, setRelatedAlarmIds] = useState<string[]>([])
  const [component, setComponent] = useState('')
  const [action, setAction] = useState('')
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'excluded'>('pending')
  const [material, setMaterial] = useState('')
  const [object, setObject] = useState('')
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!component || !action || !material || !object) return

    addMaintenance({
      relatedAlarmIds,
      component,
      action,
      confirmed: status === 'confirmed',
      excluded: status === 'excluded',
      timestamp: new Date(timestamp).toISOString(),
      material,
      object,
    })

    setRelatedAlarmIds([])
    setComponent('')
    setAction('')
    setStatus('pending')
    setMaterial('')
    setObject('')
    setTimestamp(new Date().toISOString().slice(0, 16))
  }

  const toggleAlarm = (id: string) => {
    setRelatedAlarmIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">故障部件</label>
            <input
              value={component}
              onChange={e => setComponent(e.target.value)}
              placeholder="例: 主轴承/定子绕组"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">维修措施</label>
            <input
              value={action}
              onChange={e => setAction(e.target.value)}
              placeholder="例: 更换/润滑/校准"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">材料</label>
            <input
              value={material}
              onChange={e => setMaterial(e.target.value)}
              placeholder="例: 轴承钢"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">对象</label>
            <input
              value={object}
              onChange={e => setObject(e.target.value)}
              placeholder="例: 主轴电机"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">结果</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'pending' | 'confirmed' | 'excluded')}
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="pending">处理中</option>
              <option value="confirmed">确认故障</option>
              <option value="excluded">排除故障</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">维修时间</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none font-mono"
          />
        </div>

        {alarms.length > 0 && (
          <div>
            <label className="block text-xs text-zinc-400 mb-1">关联报警（可选）</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {alarms.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relatedAlarmIds.includes(a.id)}
                    onChange={() => toggleAlarm(a.id)}
                    className="rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/30"
                  />
                  <span className="font-mono">{a.alarmType}</span>
                  <span className="text-zinc-500">({a.sensorSerial})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded px-4 py-2 text-sm hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> 添加维修结果
        </button>
      </form>

      {maintenances.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <p className="text-xs text-zinc-500">已录入 {maintenances.length} 条维修结果</p>
          {maintenances.map(m => (
            <div key={m.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-medium",
                  m.confirmed ? "text-emerald-400" : m.excluded ? "text-red-400" : "text-zinc-300"
                )}>
                  {m.confirmed ? '✓ 确认' : m.excluded ? '✗ 排除' : '○ 处理中'} {m.component}
                </span>
                <button onClick={() => removeMaintenance(m.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-zinc-400 mt-1">{m.action} | {m.material}/{m.object}</div>
              {m.labelDelayDetected && (
                <div className="flex items-center gap-1 text-yellow-400 mt-1">
                  <Clock size={12} /> 标签滞后检测：维修时间与报警时间间隔超过72h
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
