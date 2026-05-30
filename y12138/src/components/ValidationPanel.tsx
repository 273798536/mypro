import { useFilmStore } from '@/store/useFilmStore';
import { ISSUE_LABELS } from '@/types';
import type { IssueType } from '@/types';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

const ISSUE_ICONS: Record<IssueType, typeof AlertTriangle> = {
  zero_thickness: AlertTriangle,
  missing_n: XCircle,
  angle_oob: AlertTriangle,
  missing_column: Info,
  empty_row: Info,
  comment_row: Info,
};

const ISSUE_COLORS: Record<IssueType, string> = {
  zero_thickness: 'text-amber-400 bg-amber-500/10 border-amber-600/20',
  missing_n: 'text-red-400 bg-red-500/10 border-red-600/20',
  angle_oob: 'text-amber-400 bg-amber-500/10 border-amber-600/20',
  missing_column: 'text-orange-400 bg-orange-500/10 border-orange-600/20',
  empty_row: 'text-slate-400 bg-slate-500/10 border-slate-600/20',
  comment_row: 'text-slate-400 bg-slate-500/10 border-slate-600/20',
};

export default function ValidationPanel() {
  const { batch } = useFilmStore();

  if (!batch || batch.validations.length === 0) {
    if (!batch) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/10 border border-emerald-700/20">
        <span className="text-emerald-400 text-xs">✓ 参数校验通过，无异常</span>
      </div>
    );
  }

  const grouped = batch.validations.reduce<Record<IssueType, typeof batch.validations>>((acc, v) => {
    if (!acc[v.issueType]) acc[v.issueType] = [];
    acc[v.issueType].push(v);
    return acc;
  }, {} as Record<IssueType, typeof batch.validations>);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-300 tracking-wide">参数校验</h3>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(grouped).map(([type, entries]) => {
          const t = type as IssueType;
          const Icon = ISSUE_ICONS[t];
          return (
            <div
              key={t}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${ISSUE_COLORS[t]}`}
            >
              <Icon size={12} />
              <span>{ISSUE_LABELS[t]}</span>
              <span className="font-mono opacity-70">×{entries.length}</span>
            </div>
          );
        })}
      </div>
      <div className="overflow-auto max-h-[120px] rounded border border-slate-700">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#0d1117] text-slate-500 uppercase tracking-wider">
              <th className="px-2 py-1 text-left">行号</th>
              <th className="px-2 py-1 text-left">类型</th>
              <th className="px-2 py-1 text-left">描述</th>
            </tr>
          </thead>
          <tbody>
            {batch.validations.map((v, i) => (
              <tr key={i} className="border-t border-slate-800">
                <td className="px-2 py-0.5 font-mono text-slate-400">{v.rowIndex || '-'}</td>
                <td className="px-2 py-0.5">
                  <span className={`text-xs ${ISSUE_COLORS[v.issueType as IssueType]?.split(' ')[0] || 'text-slate-400'}`}>
                    {ISSUE_LABELS[v.issueType as IssueType]}
                  </span>
                </td>
                <td className="px-2 py-0.5 text-slate-400">{v.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
