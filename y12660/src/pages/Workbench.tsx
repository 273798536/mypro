import { useEffect, useMemo, useState } from 'react';
import { useRecordsStore } from '@/store/records';
import { AnomalyFilters } from '@/components/filters/AnomalyFilters';
import { RecordsTable } from '@/components/table/RecordsTable';
import { RecordPreview } from '@/components/table/RecordPreview';
import { ImportButton } from '@/components/common/ImportButton';
import { filterRecords } from '@/utils/filterRecords';
import { Database, Download, Trash2 } from 'lucide-react';

export default function Workbench() {
  const initializeIfNeeded = useRecordsStore((s) => s.initializeIfNeeded);
  const records = useRecordsStore((s) => s.records);
  const batches = useRecordsStore((s) => s.batches);
  const filters = useRecordsStore((s) => s.filters);
  const clearAll = useRecordsStore((s) => s.clearAll);
  const filtered = useMemo(() => filterRecords(records, filters), [records, filters]);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    initializeIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const anomalyCount = records.filter((r) => r.anomalies.length > 0).length;
  const unusable = records.filter((r) => r.availabilityStatus === 'unusable').length;
  const usable = records.filter((r) => r.availabilityStatus === 'usable').length;
  const review = records.filter((r) => r.availabilityStatus === 'review_needed').length;

  const exportJson = () => {
    const data = { batches, records, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hall-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 border-b border-hall-border bg-hall-bg2/60 flex items-center px-5 gap-4">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-hall-accent" />
          <span className="text-sm font-semibold font-display">数据工作台</span>
          <span className="text-[11px] text-hall-textMute">
            共 {records.length} 条 · {filtered.length} 条匹配筛选
          </span>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <StatChip label="可直接用" value={usable} color="text-status-usable" dot="bg-status-usable" />
          <StatChip label="需复核" value={review} color="text-hall-textDim" dot="bg-status-review" />
          <StatChip label="不可用" value={unusable} color="text-status-unusable" dot="bg-status-unusable" />
          <StatChip label="含异常" value={anomalyCount} color="text-anomaly-warn" dot="bg-anomaly-warn" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ImportButton
            onDone={(r) =>
              setToast({
                msg: `导入完成：新增 ${r.added} 条，跳过重复 ${r.skipped} 条`,
                kind: 'ok',
              })
            }
          />
          <button onClick={exportJson} className="btn btn-ghost">
            <Download size={13} /> 导出 JSON
          </button>
          <button
            onClick={() => {
              if (confirm('确认清空所有本地数据？此操作不可撤销。')) {
                clearAll();
                setToast({ msg: '已清空所有本地数据', kind: 'ok' });
              }
            }}
            className="btn btn-danger"
          >
            <Trash2 size={13} /> 清空
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <AnomalyFilters />
        <RecordsTable />
        <RecordPreview />
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded border text-sm shadow-card backdrop-blur-sm z-50 ${
            toast.kind === 'ok'
              ? 'bg-status-usable/10 border-status-usable/40 text-status-usable'
              : 'bg-status-unusable/10 border-status-unusable/40 text-status-unusable'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: number;
  color: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-hall-border bg-hall-bg/60">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[11px] text-hall-textMute">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}
