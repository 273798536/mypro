import { Calculator, Ruler, AlertTriangle } from 'lucide-react';
import { sliceFormulaInfo } from '@/utils/formulas';

export default function FormulaInfoBar() {
  return (
    <div className="bg-industrial-800/60 border-b border-industrial-600/50 px-6 py-2 grid grid-cols-3 gap-6 text-xs">
      <div className="flex items-start gap-2">
        <Calculator className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-slate-400 uppercase tracking-wide mb-0.5">核心公式速查</div>
          <code className="text-slate-300 font-mono">{sliceFormulaInfo.formula}</code>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Ruler className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-slate-400 uppercase tracking-wide mb-0.5">单位说明</div>
          <div className="text-slate-300 font-mono">{sliceFormulaInfo.units}</div>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-slate-400 uppercase tracking-wide mb-0.5">适用范围</div>
          <div className="text-slate-300">{sliceFormulaInfo.range}</div>
        </div>
      </div>
    </div>
  );
}
