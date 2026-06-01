import { useParams } from 'react-router-dom'
import { Play } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useBatchStore } from '@/stores/batchStore'

export default function CalculationSection() {
  const { id } = useParams<{ id: string }>()
  const { calculation, calculate, fetchCalculation, loading } = useBatchStore()

  const handleCalculate = async () => {
    if (!id) return
    await calculate(id)
    fetchCalculation(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-100">升阻力计算</h2>
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50"
        >
          <Play size={14} />
          执行计算
        </button>
      </div>

      {calculation && (
        <>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={calculation.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="alpha" stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 12 }} label={{ value: 'α (°)', position: 'insideBottomRight', offset: -5, fill: '#94A3B8' }} />
                <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#F8FAFC' }}
                />
                <Legend />
                <Line type="monotone" dataKey="cl" stroke="#F59E0B" strokeWidth={2} dot={false} name="Cl" />
                <Line type="monotone" dataKey="cd" stroke="#10B981" strokeWidth={2} dot={false} name="Cd" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {calculation.zeroCorrectionApplied && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md px-4 py-2 text-sm text-amber-400">
              已应用零点修正，修正值: {calculation.zeroCorrectionValue}
              {calculation.calculationNote && ` — ${calculation.calculationNote}`}
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800">
                  <th className="px-4 py-2 text-left text-slate-400 font-medium">α (°)</th>
                  <th className="px-4 py-2 text-left text-slate-400 font-medium">Cl</th>
                  <th className="px-4 py-2 text-left text-slate-400 font-medium">Cd</th>
                  <th className="px-4 py-2 text-left text-slate-400 font-medium">Cl/Cd</th>
                </tr>
              </thead>
              <tbody>
                {calculation.points.map((p, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="px-4 py-1.5 text-slate-300 font-mono">{p.alpha}</td>
                    <td className="px-4 py-1.5 text-amber-400 font-mono">{p.cl.toFixed(4)}</td>
                    <td className="px-4 py-1.5 text-emerald-400 font-mono">{p.cd.toFixed(4)}</td>
                    <td className="px-4 py-1.5 text-slate-300 font-mono">{p.cl_cd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!calculation && !loading && (
        <div className="text-center text-slate-500 py-8">点击"执行计算"生成升阻力曲线</div>
      )}
    </div>
  )
}
