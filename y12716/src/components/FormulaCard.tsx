import { Calculator, Info, AlertTriangle, Ruler } from 'lucide-react';
import { FORMULA_META } from '@/types';

export function FormulaCard() {
  return (
    <div className="rounded-lg border-2 border-[#1e3a5f] bg-[#0f2138] text-white shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
        <Calculator className="h-5 w-5 text-[#d4a24c]" />
        <h3 className="font-serif text-lg font-semibold text-[#d4a24c]">排期计算公式</h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded border border-[#2a4a73] bg-[#1a2f4d] px-4 py-3">
          <div className="mb-1 text-xs text-gray-400">综合评分公式</div>
          <div className="font-mono text-xl tracking-wide text-[#d4a24c]">
            {FORMULA_META.expression}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#4a8ec2]" />
            <span className="text-sm font-semibold text-gray-200">变量说明</span>
          </div>
          <div className="space-y-1.5">
            {FORMULA_META.variables.map((v) => (
              <div key={v.symbol} className="flex items-start gap-3 rounded bg-[#1a2f4d]/60 px-3 py-2">
                <span className="shrink-0 rounded bg-[#1e3a5f] px-2 py-0.5 font-mono text-sm text-[#d4a24c]">
                  {v.symbol}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-100">
                    <span className="font-medium">{v.name}</span>
                    <span className="ml-2 text-xs text-gray-400">单位：{v.unit}</span>
                  </div>
                  <div className="text-xs text-gray-400">{v.description}</div>
                  <div className="text-xs text-[#4a8ec2]">默认值：{v.defaultValue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-[#2d936c]" />
            <span className="text-sm font-semibold text-gray-200">适用单位</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FORMULA_META.units.map((u) => (
              <span
                key={u}
                className="rounded-full border border-[#2d936c]/40 bg-[#2d936c]/10 px-2.5 py-0.5 text-xs text-[#7bc9a7]"
              >
                {u}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#2d936c]" />
            <span className="text-sm font-semibold text-gray-200">适用范围</span>
          </div>
          <blockquote className="border-l-2 border-[#d4a24c] bg-[#1a2f4d]/40 px-3 py-2 text-sm text-gray-300 italic">
            {FORMULA_META.applicableRange}
          </blockquote>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#c85353]" />
            <span className="text-sm font-semibold text-gray-200">常见失败原因</span>
          </div>
          <ul className="space-y-1">
            {FORMULA_META.failureReasons.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded border border-[#c85353]/30 bg-[#c85353]/10 px-3 py-1.5 text-xs text-[#e99090]"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c85353]" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
