import { useRef, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileSpreadsheet, Database } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import type { ImportResult } from '@/types';

export default function DataImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<Array<Record<string, unknown>> | null>(null);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const importRecords = useDataStore((s) => s.importRecords);
  const loadMockData = useDataStore((s) => s.loadMockData);
  const records = useDataStore((s) => s.records);
  const importResults = useDataStore((s) => s.importResults);
  const clearAll = useDataStore((s) => s.clearAll);

  const parseFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    let rows: Array<Record<string, unknown>> = [];
    if (file.name.endsWith('.json')) {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : parsed.records ?? [];
    } else {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim());
      rows = lines.slice(1).map((line) => {
        const cells = line.split(',');
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => (obj[h] = cells[i]?.trim() ?? ''));
        return obj;
      });
    }
    setPreview(rows.slice(0, 20));
    const result = importRecords(rows, file.name);
    setLastResult(result);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  return (
    <div className="panel-ocean p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-data-cyan" />
          <span className="text-sm font-semibold text-slate-200">数据导入</span>
          <span className="chip-ocean">{records.length} 条</span>
        </div>
        <button
          className="btn-ocean text-xs"
          onClick={() => { loadMockData(); setFileName('内置示例数据'); }}
        >
          载入示例
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-data-cyan bg-data-cyan/5' : 'border-ocean-600 hover:border-ocean-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-6 h-6 mx-auto text-data-cyan/70 mb-1" />
        <div className="text-xs text-slate-400">拖拽 CSV / JSON 到此，或点击选择</div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
        />
        {fileName && <div className="text-[11px] font-mono text-data-cyan mt-1 truncate">{fileName}</div>}
      </div>

      {lastResult && (
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center gap-1 bg-ocean-800/60 rounded px-2 py-1">
            <FileSpreadsheet className="w-3 h-3 text-slate-400" />
            <span className="text-slate-300">读取</span>
            <span className="ml-auto font-mono text-data-cyan">{lastResult.total}</span>
          </div>
          <div className="flex items-center gap-1 bg-ocean-800/60 rounded px-2 py-1">
            <CheckCircle2 className="w-3 h-3 text-data-green" />
            <span className="text-slate-300">入库</span>
            <span className="ml-auto font-mono text-data-green">{lastResult.inserted}</span>
          </div>
          <div className="flex items-center gap-1 bg-ocean-800/60 rounded px-2 py-1">
            <XCircle className="w-3 h-3 text-data-purple" />
            <span className="text-slate-300">重复</span>
            <span className="ml-auto font-mono text-data-purple">{lastResult.duplicates}</span>
          </div>
          <div className="flex items-center gap-1 bg-ocean-800/60 rounded px-2 py-1">
            <AlertTriangle className="w-3 h-3 text-data-orange" />
            <span className="text-slate-300">坐标系混用</span>
            <span className="ml-auto font-mono text-data-orange">{lastResult.mixed}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1 bg-ocean-800/60 rounded px-2 py-1">
            <AlertTriangle className="w-3 h-3 text-data-red" />
            <span className="text-slate-300">越界记录</span>
            <span className="ml-auto font-mono text-data-red">{lastResult.outOfBounds}</span>
          </div>
          <div className="col-span-2 text-[10px] text-slate-500 font-mono px-1">批次 ID: {lastResult.batchId}</div>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="border border-ocean-700 rounded overflow-hidden">
          <div className="text-[10px] text-slate-400 px-2 py-1 bg-ocean-800/80 font-mono">预览前 {preview.length} 行</div>
          <div className="max-h-24 overflow-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="bg-ocean-800/40 text-slate-400">
                  {Object.keys(preview[0]).slice(0, 5).map((k) => (
                    <th key={k} className="px-2 py-1 text-left font-normal">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-ocean-800 text-slate-300">
                    {Object.values(r).slice(0, 5).map((v, j) => (
                      <td key={j} className="px-2 py-0.5 truncate max-w-[80px]">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importResults.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-ocean-700">
          <div className="text-[10px] text-slate-500">已导入 {importResults.length} 批次</div>
          <button className="btn-ocean-danger text-xs" onClick={clearAll}>清空数据</button>
        </div>
      )}
    </div>
  );
}
