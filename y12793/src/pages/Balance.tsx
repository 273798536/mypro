import { useState } from 'react'
import { Scale, ArrowRight, CheckCircle2, XCircle, Zap } from 'lucide-react'
import { balanceEquation } from '@/utils/balance'
import type { BalanceResult } from '@/utils/balance'

const quickEquations = [
  'Fe + O2 -> Fe3O4',
  'H2 + O2 -> H2O',
  'Na + Cl2 -> NaCl',
  'CH4 + O2 -> CO2 + H2O',
  'Al + HCl -> AlCl3 + H2',
  'CaCO3 + HCl -> CaCl2 + H2O + CO2',
]

function renderBalancedEquation(eq: string) {
  const tokens = eq.split(/(\s+)/)
  return tokens.map((token, i) => {
    if (/^\d+/.test(token)) {
      const match = token.match(/^(\d+)(.*)$/)
      if (match) {
        return (
          <span key={i}>
            <span className="font-bold text-teal-700">{match[1]}</span>
            {match[2]}
          </span>
        )
      }
    }
    return <span key={i}>{token}</span>
  })
}

export default function Balance() {
  const [equation, setEquation] = useState('')
  const [result, setResult] = useState<BalanceResult | null>(null)

  const handleBalance = () => {
    if (!equation.trim()) return
    setResult(balanceEquation(equation))
  }

  const handleQuickSelect = (eq: string) => {
    setEquation(eq)
    setResult(balanceEquation(eq))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6 text-teal-700" />
          配平计算
        </h1>
        <p className="text-sm text-gray-500 mt-1">月底/课前复核 — 化学方程式配平验证</p>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <input
          type="text"
          value={equation}
          onChange={(e) => setEquation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBalance()}
          placeholder="输入化学方程式，如 Fe + O2 -> Fe3O4"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
        <div className="flex flex-wrap gap-2">
          {quickEquations.map((eq) => (
            <button
              key={eq}
              onClick={() => handleQuickSelect(eq)}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-teal-50 hover:border-teal-700 hover:text-teal-700 transition-colors"
            >
              {eq}
            </button>
          ))}
        </div>
        <button
          onClick={handleBalance}
          className="w-full bg-teal-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <Zap className="w-4 h-4" />
          配平
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="text-sm text-gray-500">原始方程</div>
          <div className="text-lg font-mono">{result.equation}</div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-teal-700" />
          </div>
          <div className="text-sm text-gray-500">配平结果</div>
          <div className="text-lg font-mono">{renderBalancedEquation(result.balancedEquation)}</div>
        </div>
      )}

      {result && result.steps.length > 0 && (
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-700" />
            配平步骤
          </h2>
          <ol className="space-y-4">
            {result.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-700 text-white text-xs flex items-center justify-center font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm">{step.description}</p>
                  {Object.keys(step.atomCounts).length > 0 && (
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="px-2 py-0.5 text-left font-medium">原子</th>
                          <th className="px-2 py-0.5 text-right font-medium">左侧</th>
                          <th className="px-2 py-0.5 text-right font-medium">右侧</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(step.atomCounts).map(([atom, counts]) => (
                          <tr key={atom} className="border-t">
                            <td className="px-2 py-0.5 font-medium">{atom}</td>
                            <td className="px-2 py-0.5 text-right">{counts.left}</td>
                            <td className="px-2 py-0.5 text-right">{counts.right}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="flex items-center gap-1 text-xs">
                    {step.isBalanced ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className={step.isBalanced ? 'text-green-600' : 'text-red-500'}>
                      {step.isBalanced ? '已配平' : '未配平'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
