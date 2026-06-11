import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CALCULATION_FORMULAS } from '@/data/formulas';
import type { CalculationFormula } from '@/types';

interface FormulaPanelProps {
  activeFormula?: string;
  showAll?: boolean;
}

export const FormulaPanel: React.FC<FormulaPanelProps> = ({
  activeFormula,
  showAll = false
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    showAll ? 0 : null
  );

  const formulasToShow = activeFormula
    ? CALCULATION_FORMULAS.filter(f => f.name === activeFormula)
    : CALCULATION_FORMULAS;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Calculator size={20} />
          <h3 className="font-semibold text-base">计算公式说明</h3>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {formulasToShow.map((formula, index) => (
          <FormulaCard
            key={formula.name}
            formula={formula}
            isExpanded={expandedIndex === index}
            onToggle={() => toggleExpand(index)}
            isFirst={index === 0}
          />
        ))}
      </div>

      <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <p>
            <strong>适用范围提示：</strong>
            本计算工具适用于贴壁生长细胞的划痕实验，
            划痕宽度建议500-1000μm，细胞存活率需大于90%。
          </p>
        </div>
      </div>
    </div>
  );
};

interface FormulaCardProps {
  formula: CalculationFormula;
  isExpanded: boolean;
  onToggle: () => void;
  isFirst: boolean;
}

const FormulaCard: React.FC<FormulaCardProps> = ({
  formula,
  isExpanded,
  onToggle,
  isFirst
}) => {
  return (
    <div className={!isFirst ? 'border-t border-slate-100' : ''}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">{formula.name.charAt(0)}</span>
          </div>
          <div className="text-left">
            <h4 className="font-medium text-slate-800 text-sm">{formula.name}</h4>
            <p className="text-xs text-slate-500 font-mono">{formula.formula}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
            {formula.unit || '-'}
          </span>
          {isExpanded ? (
            <ChevronUp size={18} className="text-slate-400" />
          ) : (
            <ChevronDown size={18} className="text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              {formula.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">适用范围</span>
              </div>
              <p className="text-xs text-emerald-700">{formula.applicableRange}</p>
            </div>

            <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-rose-600" />
                <span className="text-xs font-semibold text-rose-700">不适用情况</span>
              </div>
              <ul className="text-xs text-rose-700 space-y-1">
                {formula.notApplicable.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaPanel;
