import { useFilmStore } from '@/store/useFilmStore';
import { exportBatchToCSV } from '@/utils/exporter';
import { Download, FileDown } from 'lucide-react';

export default function ExportButton() {
  const { batch } = useFilmStore();

  if (!batch || batch.results.length === 0) return null;

  const handleExport = () => {
    exportBatchToCSV(batch);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleExport}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600/20 to-fuchsia-600/20 text-slate-200 rounded-lg border border-cyan-600/20 hover:border-cyan-500/40 hover:from-cyan-600/30 hover:to-fuchsia-600/30 transition-all text-sm font-medium"
      >
        <Download size={16} />
        下载 CSV
      </button>
      <div className="text-[10px] text-slate-600 px-1">
        <div className="flex items-center gap-1 mb-0.5">
          <FileDown size={10} />
          <span>导出内容包含：</span>
        </div>
        <ul className="ml-3 space-y-0.5 list-disc text-slate-500">
          <li>反射率明细 ({batch.results.length} 条波长数据)</li>
          <li>参数校验 ({batch.validations.length} 条)</li>
          <li>异常行 ({batch.badRows.length} 行)</li>
        </ul>
        <p className="mt-1 text-slate-600">所有数据来自同一批次 (batchId: <span className="font-mono">{batch.batchId.slice(0, 16)}…</span>)</p>
      </div>
    </div>
  );
}
