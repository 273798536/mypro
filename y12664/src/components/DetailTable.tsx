import { useEffect, useRef } from 'react';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import type { Cage, CageStatus, ValidationIssue } from '@/types';

const statusStyles: Record<CageStatus, string> = {
  normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  error: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const statusText: Record<CageStatus, string> = {
  normal: '正常',
  pending: '待确认',
  error: '异常',
};

function findIssue(cageId: string, issues: ValidationIssue[]): ValidationIssue | undefined {
  return issues.find((i) => i.cageId === cageId);
}

export default function DetailTable() {
  const cages = useLayoutStore((s) => s.cages);
  const issues = useLayoutStore((s) => s.issues);
  const selected = useLayoutStore((s) => s.selectedCageId);
  const selectCage = useLayoutStore((s) => s.selectCage);
  const updateCage = useLayoutStore((s) => s.updateCage);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (selected && rowRefs.current[selected]) {
      rowRefs.current[selected]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div className="bg-slate-900/70 backdrop-blur-sm border border-slate-700/60 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
        <h3 className="text-slate-100 font-semibold tracking-wide text-sm">笼位明细</h3>
        <div className="text-xs text-slate-400">共 {cages.length} 条</div>
      </div>
      <div className="overflow-y-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="bg-slate-800/70 sticky top-0 z-10">
            <tr className="text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="text-left px-3 py-2 font-medium">编号</th>
              <th className="text-left px-3 py-2 font-medium">坐标</th>
              <th className="text-left px-3 py-2 font-medium">状态</th>
              <th className="text-left px-3 py-2 font-medium">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {cages.map((c: Cage) => {
              const iss = findIssue(c.id, issues);
              const isSelected = selected === c.id;
              return (
                <tr
                  key={c.id}
                  ref={(el) => { rowRefs.current[c.id] = el; }}
                  onClick={() => selectCage(isSelected ? null : c.id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-sky-500/15 hover:bg-sky-500/20'
                      : c.status === 'error' || iss
                      ? 'bg-red-900/20 hover:bg-red-900/30'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-slate-200">{c.remark}</td>
                  <td className="px-3 py-2 font-mono text-slate-300">
                    {c.x.toFixed(2)}, {c.y.toFixed(2)}, {c.z.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={c.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateCage(c.id, { status: e.target.value as CageStatus })}
                      className={`text-[11px] px-2 py-0.5 rounded border ${statusStyles[c.status]} bg-transparent focus:outline-none`}
                    >
                      <option value="normal">{statusText.normal}</option>
                      <option value="pending">{statusText.pending}</option>
                      <option value="error">{statusText.error}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={c.remark}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateCage(c.id, { remark: e.target.value })}
                      className="w-full bg-transparent text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500/50 rounded px-1 py-0.5"
                    />
                    {iss && (
                      <div className="mt-1 text-[10px] text-red-400 leading-snug">{iss.detail}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
