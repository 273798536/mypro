import type { Scheme } from '@/types';
import { generateReport, downloadText } from '@/utils/export';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  schemes: Scheme[];
}

export default function ExportDialog({ open, onClose, schemes }: Props) {
  if (!open) return null;

  const exportSingle = (scheme: Scheme) => {
    const report = generateReport(scheme);
    downloadText(report, `${scheme.name}-试算报告.txt`);
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(schemes, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schemes-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-amber-400">导出</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {schemes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">暂无方案可导出</p>
          )}

          {schemes.length > 0 && (
            <>
              <button
                onClick={exportAll}
                className="w-full px-4 py-3 text-sm bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
              >
                导出全部方案 (JSON)
              </button>
              <div className="text-xs text-slate-500 text-center">或单独导出报告</div>
            </>
          )}

          <div className="max-h-48 overflow-y-auto space-y-2">
            {schemes.map((s) => (
              <button
                key={s.id}
                onClick={() => exportSingle(s)}
                className="w-full px-3 py-2 text-sm text-left bg-slate-800/50 text-slate-300 rounded hover:bg-slate-700/50 transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
