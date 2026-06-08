import { useRef, useState } from 'react';
import { Upload, X, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import { parseCsvFile } from '@/utils/csvParser';
import type { ImportResult } from '@/types';

export default function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const importRows = useProjectionStore((s) => s.importRows);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const rows = await parseCsvFile(file);
      if (rows.length === 0) {
        setError('文件为空或格式无法识别');
        return;
      }
      const r = importRows(rows, projectName || undefined);
      setResult(r);
    } catch (e: any) {
      setError(e?.message || '解析失败');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const records = useProjectionStore((s) => s.records);
  const filtered = useProjectionStore((s) => s.getFilteredRecords)();
  const cameraLost = records.filter((r) => r.anomalyType === 'camera_view_lost').length;
  const warning = records.filter((r) => r.severity === 'warning').length;
  const critical = records.filter((r) => r.severity === 'critical').length;

  return (
    <div className="border-b border-panel-border bg-panel-surface">
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            导入 CSV / Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={onChange}
          />
        </div>

        <div className="h-6 w-px bg-panel-border" />

        <div className="flex items-center gap-1.5">
          <span className="label-sm">当前项目：</span>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="可选，导入时使用"
            className="bg-panel-bg border border-panel-border text-xs px-2.5 py-1.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/60 w-44"
          />
        </div>

        {loading && (
          <div className="text-xs text-amber-400 flex items-center gap-1.5">
            <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            解析中…
          </div>
        )}

        {result && (
          <div className="text-xs text-lime-400 flex items-center gap-1.5 bg-lime-500/10 border border-lime-500/30 px-3 py-1.5">
            <Check className="w-3.5 h-3.5" />
            批次 {result.batchId.slice(-4)}：新增 {result.added}，合并 {result.merged}，重复 {result.duplicates}，异常 {result.newAnomalies}
          </div>
        )}

        {error && (
          <div className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
            <button onClick={() => setError(null)} className="ml-1 hover:text-rose-200">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-5">
          <StatChip label="显示" value={filtered.length} total={records.length} hint="筛选 / 全部" />
          <StatChip label="视角丢失" value={cameraLost} color="text-rose-400" dot="bg-rose-500" />
          <StatChip label="严重" value={critical} color="text-rose-400" dot="bg-rose-500" />
          <StatChip label="警告" value={warning} color="text-amber-400" dot="bg-amber-500" />
          <div className="text-[11px] text-zinc-600 font-mono flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV 列：row, image, source, project, anomaly, severity, conclusion, suggestion
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  total,
  hint,
  color = 'text-zinc-300',
  dot,
}: {
  label: string;
  value: number;
  total?: number;
  hint?: string;
  color?: string;
  dot?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={`w-2 h-2 ${dot}`} />}
      <div className="leading-tight">
        <div className={`font-mono text-sm font-semibold ${color}`}>
          {value}
          {typeof total === 'number' && <span className="text-zinc-600 font-normal"> / {total}</span>}
        </div>
        <div className="text-[10px] text-zinc-500">{hint ?? label}</div>
      </div>
    </div>
  );
}
