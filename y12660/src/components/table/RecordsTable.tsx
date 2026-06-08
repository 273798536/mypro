import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecordsStore } from '@/store/records';
import { filterRecords } from '@/utils/filterRecords';
import { AnomalyTag, StatusBadge, EmptyState } from '@/components/common/Badges';
import { formatDateTime, formatCoordinatesTriple } from '@/utils/formatters';
import { FileText, AlertTriangle } from 'lucide-react';

export function RecordsTable() {
  const allRecords = useRecordsStore((s) => s.records);
  const filters = useRecordsStore((s) => s.filters);
  const records = useMemo(() => filterRecords(allRecords, filters), [allRecords, filters]);
  const batches = useRecordsStore((s) => s.batches);
  const selectedId = useRecordsStore((s) => s.selectedRecordId);
  const setSelected = useRecordsStore((s) => s.setSelectedRecord);
  const navigate = useNavigate();

  const batchMap = useMemo(() => {
    const m = new Map<string, string>();
    batches.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [batches]);

  if (!records.length) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="暂无匹配记录"
          desc="尝试调整筛选条件，或导入一批新数据"
        />
      </div>
    );
  }

  const highestSeverity = (r: typeof records[number]) =>
    r.anomalies.some((a) => a.severity === 'error') ? 'error' : r.anomalies.some((a) => a.severity === 'warning') ? 'warning' : null;

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 z-10 bg-hall-bg2 border-b border-hall-border">
          <tr className="text-hall-textMute text-[11px] uppercase tracking-wider">
            <th className="text-left font-medium py-2.5 px-3 w-10" />
            <th className="text-left font-medium py-2.5 px-3">记录 ID</th>
            <th className="text-left font-medium py-2.5 px-3">设备编号</th>
            <th className="text-left font-medium py-2.5 px-3">坐标</th>
            <th className="text-left font-medium py-2.5 px-3">来源批次</th>
            <th className="text-left font-medium py-2.5 px-3">异常</th>
            <th className="text-left font-medium py-2.5 px-3">状态</th>
            <th className="text-left font-medium py-2.5 px-3">最近处理</th>
            <th className="text-left font-medium py-2.5 px-3 w-16" />
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const sev = highestSeverity(r);
            const isSelected = r.id === selectedId;
            const border =
              sev === 'error'
                ? 'border-l-status-unusable'
                : sev === 'warning'
                ? 'border-l-anomaly-warn'
                : 'border-l-transparent';
            return (
              <tr
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`border-l-2 ${border} ${i % 2 ? 'bg-hall-bg/30' : ''} ${
                  isSelected ? 'bg-hall-accent/10' : 'hover:bg-hall-bg3/60'
                } cursor-pointer transition-colors`}
              >
                <td className="py-2.5 px-3">
                  {sev === 'error' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-unusable" />}
                  {sev === 'warning' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-anomaly-warn" />}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-hall-textDim">{r.id.slice(0, 10)}…</td>
                <td className="py-2.5 px-3 text-hall-text font-medium">{r.deviceCode}</td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-hall-textDim">
                  {formatCoordinatesTriple(r.deviceCoordinates)}
                </td>
                <td className="py-2.5 px-3 text-hall-textDim truncate max-w-[180px]" title={batchMap.get(r.batchId)}>
                  {batchMap.get(r.batchId) ?? '—'}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1 max-w-[240px]">
                    {r.anomalies.length ? (
                      r.anomalies.slice(0, 3).map((a) => <AnomalyTag key={a.id} type={a.type} severity={a.severity} />)
                    ) : (
                      <span className="text-hall-textMute/60 text-[11px]">—</span>
                    )}
                    {r.anomalies.length > 3 && (
                      <span className="text-[11px] text-hall-textMute">+{r.anomalies.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={r.availabilityStatus} />
                </td>
                <td className="py-2.5 px-3 text-hall-textMute whitespace-nowrap">
                  {r.reviewedAt ? (
                    <div>
                      <div className="text-[11px]">{r.reviewedBy}</div>
                      <div className="text-[10px] opacity-70">{formatDateTime(r.reviewedAt)}</div>
                    </div>
                  ) : (
                    <span className="text-[11px] opacity-50">未处理</span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/record/${r.id}`);
                    }}
                    className="btn btn-ghost !px-2 !py-1"
                  >
                    <FileText size={13} /> 详情
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
