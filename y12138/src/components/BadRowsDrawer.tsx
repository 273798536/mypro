import { useState } from 'react';
import { useFilmStore } from '@/store/useFilmStore';
import { FileWarning, ChevronDown, ChevronUp } from 'lucide-react';

export default function BadRowsDrawer() {
  const { batch } = useFilmStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!batch || batch.badRows.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors text-left"
      >
        <FileWarning size={14} className="text-slate-400" />
        <span className="text-xs text-slate-300">异常行清单</span>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded">
          {batch.badRows.length} 行
        </span>
        <span className="ml-auto text-slate-500">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="bg-[#0d1117]/80">
          <div className="overflow-auto max-h-[200px]">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0">
                <tr className="bg-[#0d1117] text-slate-500 uppercase tracking-wider">
                  <th className="px-2 py-1 text-left">行号</th>
                  <th className="px-2 py-1 text-left">原始内容</th>
                  <th className="px-2 py-1 text-left">异常原因</th>
                </tr>
              </thead>
              <tbody>
                {batch.badRows.map((row, i) => {
                  const reasons: string[] = [];
                  if (row.status.isEmpty) reasons.push('空行');
                  if (row.status.isComment) reasons.push('备注行');
                  if (row.status.missingColumns) reasons.push('列缺失');
                  if (row.status.zeroThickness) reasons.push('层厚为零');
                  if (row.status.missingRefractiveIndex) reasons.push('折射率缺失');
                  return (
                    <tr key={i} className="border-t border-slate-800">
                      <td className="px-2 py-0.5 font-mono text-slate-400">{row.rowIndex}</td>
                      <td className="px-2 py-0.5 font-mono text-slate-500 truncate max-w-[200px]" title={row.status.rawContent}>
                        {row.status.rawContent || '(空)'}
                      </td>
                      <td className="px-2 py-0.5">
                        <div className="flex flex-wrap gap-1">
                          {reasons.map((r, j) => (
                            <span key={j} className="text-[10px] px-1 py-0.5 rounded bg-amber-900/20 text-amber-400">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
