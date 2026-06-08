import { useRef, useState } from 'react';
import { Upload, X, FileJson, FileSpreadsheet } from 'lucide-react';
import { useRecordsStore } from '@/store/records';

export function ImportButton({ onDone }: { onDone?: (result: { added: number; skipped: number; batchName: string }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importFromFile = useRecordsStore((s) => s.importFromFile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (f: File) => {
    setLoading(true);
    setError(null);
    try {
      const res = await importFromFile(f);
      onDone?.({ added: res.added, skipped: res.skipped, batchName: res.batch.name });
    } catch (e: any) {
      setError(e?.message ?? '导入失败');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="btn btn-primary disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-hall-accent/40 border-t-hall-accent rounded-full animate-spin" />
        ) : (
          <Upload size={15} />
        )}
        导入数据
      </button>
      <div className="ml-2 flex items-center gap-1 text-[11px] text-hall-textMute">
        <FileJson size={12} /> JSON
        <span className="mx-1 opacity-40">/</span>
        <FileSpreadsheet size={12} /> CSV
      </div>
      {error && (
        <div className="absolute top-full mt-2 left-0 flex items-center gap-1.5 text-xs text-status-unusable bg-status-unusable/10 border border-status-unusable/30 rounded px-2 py-1 whitespace-nowrap">
          <X size={12} /> {error}
        </div>
      )}
    </div>
  );
}
