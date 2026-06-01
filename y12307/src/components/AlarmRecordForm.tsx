import { useState } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useBayesianStore } from '@/store/bayesianStore'
import { getUnitsByCategory, getAllUnitCategories, convertToBase } from '@/utils/unitConversion'
import type { UnitCategory } from '@/types'
import { cn } from '@/lib/utils'

export default function AlarmRecordForm() {
  const addAlarm = useBayesianStore(s => s.addAlarm)
  const alarms = useBayesianStore(s => s.alarms)
  const removeAlarm = useBayesianStore(s => s.removeAlarm)

  const [sensorSerial, setSensorSerial] = useState('')
  const [alarmType, setAlarmType] = useState('')
  const [rawValue, setRawValue] = useState('')
  const [unitCategory, setUnitCategory] = useState<UnitCategory>('temperature')
  const [rawUnit, setRawUnit] = useState('degC')
  const [sampleSize, setSampleSize] = useState('1')
  const [material, setMaterial] = useState('')
  const [object, setObject] = useState('')
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16))

  const categoryUnits = getUnitsByCategory(unitCategory)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sensorSerial || !alarmType || !rawValue || !material || !object) return

    const conversion = convertToBase(parseFloat(rawValue), rawUnit)
    if (!conversion) return

    addAlarm({
      sensorSerial,
      alarmType,
      rawValue: parseFloat(rawValue),
      rawUnit,
      timestamp: new Date(timestamp).toISOString(),
      sampleSize: parseInt(sampleSize) || 1,
      material,
      object,
    })

    setSensorSerial('')
    setAlarmType('')
    setRawValue('')
    setSampleSize('1')
    setMaterial('')
    setObject('')
    setTimestamp(new Date().toISOString().slice(0, 16))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">传感器序列号</label>
            <input
              value={sensorSerial}
              onChange={e => setSensorSerial(e.target.value)}
              placeholder="SN-XXXX"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">报警类型</label>
            <input
              value={alarmType}
              onChange={e => setAlarmType(e.target.value)}
              placeholder="高温/振动异常/..."
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">量值</label>
            <input
              type="number"
              step="any"
              value={rawValue}
              onChange={e => setRawValue(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">量纲类别</label>
            <select
              value={unitCategory}
              onChange={e => {
                const cat = e.target.value as UnitCategory
                setUnitCategory(cat)
                const units = getUnitsByCategory(cat)
                if (units.length > 0) setRawUnit(units[0].key)
              }}
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
            >
              {getAllUnitCategories().map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'temperature' ? '温度' : cat === 'pressure' ? '压力' : cat === 'vibration' ? '振动' : cat === 'flow' ? '流量' : cat === 'voltage' ? '电压' : '电流'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">单位</label>
            <select
              value={rawUnit}
              onChange={e => setRawUnit(e.target.value)}
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none font-mono"
            >
              {categoryUnits.map(u => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">样本量</label>
            <input
              type="number"
              min="1"
              value={sampleSize}
              onChange={e => setSampleSize(e.target.value)}
              className={cn(
                "w-full bg-zinc-800/60 border rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none font-mono",
                parseInt(sampleSize) < 5 ? 'border-red-500/60' : 'border-zinc-700 focus:border-amber-500/50'
              )}
            />
            {parseInt(sampleSize) < 5 && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> 样本不足（阈值 5）
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">材料</label>
            <input
              value={material}
              onChange={e => setMaterial(e.target.value)}
              placeholder="例: 轴承钢/铜绕组"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">对象</label>
            <input
              value={object}
              onChange={e => setObject(e.target.value)}
              placeholder="例: 主轴电机/泵体"
              className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">报警时间</label>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
            className="w-full bg-zinc-800/60 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none font-mono"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded px-4 py-2 text-sm hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> 添加报警记录
        </button>
      </form>

      {alarms.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          <p className="text-xs text-zinc-500">已录入 {alarms.length} 条报警</p>
          {alarms.map(a => (
            <div key={a.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-mono">{a.alarmType}</span>
                <button onClick={() => removeAlarm(a.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-zinc-400 font-mono mt-1">
                {a.sensorSerial} | {a.rawValue} {a.rawUnit} → {a.convertedValue.toFixed(2)} {a.baseUnit}
              </div>
              <div className="text-zinc-500 mt-0.5">
                {a.material}/{a.object} | 样本 {a.sampleSize}
                {a.sampleSize < 5 && <span className="text-red-400 ml-1">⚠ 样本不足</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
