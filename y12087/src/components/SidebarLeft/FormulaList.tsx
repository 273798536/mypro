import { useCallback } from 'react';
import { ChevronRight, FunctionSquare, AlertTriangle } from 'lucide-react';
import type { VectorFieldFormula } from '@/types';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { clsx } from '@/lib/utils';

interface FormulaCardProps {
  formula: VectorFieldFormula;
  isSelected: boolean;
  onClick: () => void;
}

function FormulaCard({ formula, isSelected, onClick }: FormulaCardProps) {
  const hasBoundaryIssues =
    formula.name.includes('爆炸') ||
    formula.name.includes('反转') ||
    formula.name.includes('越界') ||
    formula.name.includes('综合');

  return (
    <div
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg cursor-pointer transition-all duration-200 border',
        isSelected
          ? 'bg-blue-900/50 border-blue-500 shadow-lg shadow-blue-500/20'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <FunctionSquare
          size={16}
          className={isSelected ? 'text-blue-400' : 'text-slate-400'}
        />
        <span
          className={clsx(
            'text-sm font-medium truncate',
            isSelected ? 'text-blue-300' : 'text-slate-300'
          )}
        >
          {formula.name}
        </span>
        {hasBoundaryIssues && (
          <AlertTriangle size={14} className="text-amber-400 ml-auto" />
        )}
        <ChevronRight
          size={16}
          className={clsx(
            'ml-auto transition-transform',
            isSelected && 'rotate-90 text-blue-400'
          )}
        />
      </div>
      <p className="text-xs text-slate-500 line-clamp-2 mb-2">
        {formula.description}
      </p>
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
        <div className="bg-slate-900/50 rounded px-1.5 py-1 text-slate-400">
          Fx: {formula.fx.slice(0, 12)}
          {formula.fx.length > 12 && '...'}
        </div>
        <div className="bg-slate-900/50 rounded px-1.5 py-1 text-slate-400">
          Fy: {formula.fy.slice(0, 12)}
          {formula.fy.length > 12 && '...'}
        </div>
        <div className="bg-slate-900/50 rounded px-1.5 py-1 text-slate-400">
          Fz: {formula.fz.slice(0, 12)}
          {formula.fz.length > 12 && '...'}
        </div>
      </div>
    </div>
  );
}

export function FormulaList() {
  const formulas = useVectorFieldStore((s) => s.formulas);
  const currentFormulaId = useVectorFieldStore((s) => s.currentFormulaId);
  const setCurrentFormula = useVectorFieldStore((s) => s.setCurrentFormula);

  const handleFormulaClick = useCallback(
    (formulaId: string) => {
      setCurrentFormula(formulaId);
    },
    [setCurrentFormula]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        向量场公式
      </h3>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {formulas.map((formula) => (
          <FormulaCard
            key={formula.id}
            formula={formula}
            isSelected={currentFormulaId === formula.id}
            onClick={() => handleFormulaClick(formula.id)}
          />
        ))}
      </div>
    </div>
  );
}
