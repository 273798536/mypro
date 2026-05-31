import Scene3D from '@/components/Scene3D'
import ParamPanel from '@/components/ParamPanel'
import PropagationPanel from '@/components/PropagationPanel'
import UnitCheckPanel from '@/components/UnitCheckPanel'
import Timeline from '@/components/Timeline'
import { useStore } from '@/store/useStore'
import { computeErrorPropagation, evaluateFormula } from '@/utils/errorPropagation'
import { checkUnits } from '@/utils/unitChecker'
import { presetTemplates, presetUnits } from '@/utils/templates'
import { useEffect, useRef } from 'react'
import { Beaker, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Workspace() {
  const currentTemplateId = useStore(s => s.currentTemplateId)
  const variables = useStore(s => s.variables)
  const formulas = useStore(s => s.formulas)
  const loadTemplate = useStore(s => s.loadTemplate)
  const setErrorPropagation = useStore(s => s.setErrorPropagation)
  const setUnitCheckResult = useStore(s => s.setUnitCheckResult)
  const setVariableValue = useStore(s => s.setVariableValue)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!currentTemplateId) {
      loadTemplate('pendulum', presetTemplates)
    }
  }, [currentTemplateId, loadTemplate])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      for (const formula of formulas) {
        const propagation = computeErrorPropagation(formula, variables)
        setErrorPropagation(propagation)
        const unitResult = checkUnits(formula, variables)
        setUnitCheckResult(unitResult)
        const resultValue = evaluateFormula(formula, variables)
        setVariableValue(formula.resultVariableId, resultValue)
      }
    }, 100)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [variables, formulas, setErrorPropagation, setUnitCheckResult, setVariableValue])

  const currentTemplate = presetTemplates.find(t => t.id === currentTemplateId)

  if (!currentTemplate) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a1a] text-gray-400">
        <div className="text-center space-y-4">
          <Beaker className="w-16 h-16 mx-auto text-emerald-400/50" />
          <p className="text-lg">请选择实验模板开始</p>
          <Link
            to="/experiments"
            className="inline-block text-emerald-400 hover:text-emerald-300 underline"
          >
            前往实验管理
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a1a] text-gray-200">
      <header className="flex items-center justify-between px-5 py-2.5 bg-[#0d0d24] border-b border-emerald-500/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <Beaker className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-emerald-300 tracking-wide">{currentTemplate.name}</span>
          <span className="text-gray-600 text-xs ml-2 font-mono">{currentTemplate.description}</span>
        </div>
        <Link
          to="/experiments"
          className="flex items-center gap-1.5 text-sm text-emerald-400/70 hover:text-emerald-300 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          实验管理
        </Link>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <Scene3D />
        </div>

        <div className="w-[380px] shrink-0 flex flex-col border-l border-gray-800/60 bg-[#0d0d1a]">
          <div className="overflow-y-auto p-3 border-b border-gray-800/40" style={{ maxHeight: '40%' }}>
            <ParamPanel />
          </div>
          <div className="overflow-y-auto p-3 border-b border-gray-800/40" style={{ maxHeight: '35%' }}>
            <PropagationPanel />
          </div>
          <div className="overflow-y-auto p-3">
            <UnitCheckPanel />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-800/60">
        <Timeline />
      </div>
    </div>
  )
}
