import { useState } from 'react'
import { Beaker, ArrowRight, ShieldAlert, Info } from 'lucide-react'
import { convertConcentration } from '@/utils/concentration'
import { useLabStore } from '@/store/useLabStore'

const PRESETS: Record<string, number> = { CuSO4: 159.6, H2SO4: 98.08, NaOH: 40.0, HCl: 36.46 }
const UNITS = ['mol/L', 'g/L', '%'] as const
type ConcUnit = 'mol/L' | 'g/L' | '%'

export default function Concentration() {
  const { concentrationRecords, safetyNotes } = useLabStore()

  const [value, setValue] = useState('')
  const [fromUnit, setFromUnit] = useState<ConcUnit>('mol/L')
  const [toUnit, setToUnit] = useState<ConcUnit>('g/L')
  const [molarMass, setMolarMass] = useState('')
  const [substance, setSubstance] = useState('')
  const [result, setResult] = useState<number | null>(null)

  const handlePreset = (name: string, mm: number) => {
    setSubstance(name)
    setMolarMass(String(mm))
  }

  const handleConvert = () => {
    const v = parseFloat(value)
    const mm = parseFloat(molarMass)
    if (isNaN(v) || isNaN(mm) || mm <= 0) return
    setResult(convertConcentration(v, fromUnit, toUnit, mm))
  }

  const matchedNotes = result !== null
    ? safetyNotes.filter(n =>
        concentrationRecords.some(c => c.substance === substance && c.recordId === n.recordId)
      )
    : []

  const safetyLevel = matchedNotes.length > 0
    ? matchedNotes.reduce<'info' | 'warning' | 'danger'>((max, n) => {
        if (n.level === 'danger') return 'danger'
        if (n.level === 'warning' && max !== 'danger') return 'warning'
        return max
      }, 'info')
    : null

  const levelStyles: Record<string, string> = {
    info: 'bg-blue-50 border-blue-300 text-blue-800',
    warning: 'bg-amber-50 border-amber-300 text-amber-800',
    danger: 'bg-red-50 border-red-300 text-red-800',
  }

  const levelLabels: Record<string, string> = {
    info: '提示',
    warning: '警告',
    danger: '危险',
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 style={{ fontFamily: 'Outfit' }} className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Beaker className="w-7 h-7 text-teal-700" />
          浓度换算
        </h1>
        <p className="text-gray-500 mt-1">日常入口 — 快速换算浓度单位</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-sm text-gray-600">数值</label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="输入数值"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">源单位</label>
            <select
              value={fromUnit}
              onChange={e => setFromUnit(e.target.value as ConcUnit)}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-center pt-5">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">目标单位</label>
            <select
              value={toUnit}
              onChange={e => setToUnit(e.target.value as ConcUnit)}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600">摩尔质量 (g/mol)</label>
          <input
            type="number"
            value={molarMass}
            onChange={e => setMolarMass(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="输入摩尔质量"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {Object.entries(PRESETS).map(([name, mm]) => (
            <button
              key={name}
              onClick={() => handlePreset(name, mm)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                substance === name
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {name} ({mm})
            </button>
          ))}
        </div>

        <button
          onClick={handleConvert}
          className="w-full py-2.5 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-colors"
        >
          换算
        </button>

        {result !== null && (
          <div className="text-center py-3 bg-teal-50 rounded-lg border border-teal-200">
            <span className="text-2xl font-bold text-teal-700">{parseFloat(result.toFixed(4))}</span>
            <span className="ml-2 text-gray-600">{toUnit}</span>
          </div>
        )}
      </div>

      {result !== null && safetyLevel && (
        <div className={`rounded-xl border p-4 space-y-2 ${levelStyles[safetyLevel]}`}>
          <div className="flex items-center gap-2 font-semibold">
            {safetyLevel === 'info' ? <Info className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {substance} — {levelLabels[safetyLevel]}
          </div>
          {matchedNotes.map(note => (
            <p key={note.id} className="text-sm">{note.content}</p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <h2 style={{ fontFamily: 'Outfit' }} className="text-lg font-semibold p-4 border-b">浓度记录</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">物质</th>
              <th className="px-4 py-2 text-left">原始值</th>
              <th className="px-4 py-2 text-left">换算值</th>
              <th className="px-4 py-2 text-left">安全提示</th>
            </tr>
          </thead>
          <tbody>
            {concentrationRecords.map(rec => (
              <tr key={rec.id} className="border-t hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-2 font-medium">{rec.substance}</td>
                <td className="px-4 py-2">{rec.value} {rec.unit}</td>
                <td className="px-4 py-2">{rec.convertedValue} {rec.convertedUnit}</td>
                <td className="px-4 py-2 text-gray-500">{rec.safetyNote || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
