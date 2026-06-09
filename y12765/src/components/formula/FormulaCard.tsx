import { useState } from 'react';
import { Calculator, Info, AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import { CONVERSION_FORMULAS } from '@/utils/conversion';
import type { FormulaMeta } from '@/types';

function SingleFormulaCard({ f }: { f: FormulaMeta }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card overflow-hidden border border-slate-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-50 to-white hover:from-brand-100 transition"
      >
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-brand-700" />
          <span className="font-semibold text-slate-800">{f.name}</span>
          <span className="chip bg-brand-700 text-white ml-1">{f.unit}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 text-sm">
          <div className="bg-slate-900 text-slate-100 rounded-md px-4 py-2 font-mono text-base tracking-wide">
            {f.formula}
          </div>
          <div className="flex gap-2">
            <Info size={15} className="text-brand-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-700 mb-0.5">适用范围</div>
              <div className="text-slate-600">{f.scope}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertOctagon size={15} className="text-warn-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-slate-700 mb-0.5">常见失败原因</div>
              <ul className="text-slate-600 list-disc pl-4 space-y-0.5">
                {f.failureReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormulaCard() {
  return (
    <div className="space-y-3">
      {CONVERSION_FORMULAS.map((f) => (
        <SingleFormulaCard key={f.id} f={f} />
      ))}
    </div>
  );
}
