import { useRecordsStore } from '@/store/records';
import { AnomalyTag, StatusBadge, EmptyState } from '@/components/common/Badges';
import { formatDateTime, formatCoordinatesTriple } from '@/utils/formatters';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RecordPreview() {
  const records = useRecordsStore((s) => s.records);
  const batches = useRecordsStore((s) => s.batches);
  const selectedId = useRecordsStore((s) => s.selectedRecordId);
  const navigate = useNavigate();
  const record = records.find((r) => r.id === selectedId);
  const batch = record ? batches.find((b) => b.id === record.batchId) : undefined;

  if (!record) {
    return (
      <div className="w-72 shrink-0 border-l border-hall-border bg-hall-bg2/40 h-full flex items-center justify-center">
        <EmptyState
          icon={<FileText size={26} />}
          title="未选择记录"
          desc="在左侧列表中点击一行查看预览"
        />
      </div>
    );
  }

  return (
    <aside className="w-72 shrink-0 border-l border-hall-border bg-hall-bg2/40 h-full overflow-y-auto">
      <div className="p-4 border-b border-hall-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-hall-textMute">记录预览</div>
          <button onClick={() => navigate(`/record/${record.id}`)} className="btn btn-primary !px-2 !py-1 text-[11px]">
            <FileText size={12} /> 打开详情
          </button>
        </div>
        <div className="font-mono text-xs text-hall-textDim">{record.id}</div>
      </div>

      <div className="p-4 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-hall-textMute text-xs">设备编号</span>
          <span className="font-medium">{record.deviceCode}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-hall-textMute text-xs mt-0.5">坐标</span>
          <span className="font-mono text-[11px] text-right">{formatCoordinatesTriple(record.deviceCoordinates)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-hall-textMute text-xs">状态</span>
          <StatusBadge status={record.availabilityStatus} />
        </div>
        <div>
          <div className="text-hall-textMute text-xs mb-1.5">来源批次</div>
          <div className="text-xs">{batch?.name ?? '—'}</div>
          <div className="text-[11px] text-hall-textMute mt-0.5">{batch && formatDateTime(batch.importedAt)} · {batch?.importedBy}</div>
        </div>
        <div>
          <div className="text-hall-textMute text-xs mb-1.5">备注</div>
          <div className="text-xs bg-hall-bg rounded border border-hall-border p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
            {record.rawRemark || '—'}
          </div>
        </div>

        <div>
          <div className="text-hall-textMute text-xs mb-1.5">异常检测 ({record.anomalies.length})</div>
          {record.anomalies.length === 0 ? (
            <div className="text-[11px] text-status-usable">未检测到异常</div>
          ) : (
            <div className="space-y-1.5">
              {record.anomalies.map((a) => (
                <div key={a.id} className="flex flex-col gap-1 p-2 rounded border border-hall-border bg-hall-bg/50">
                  <div className="flex items-center gap-1.5">
                    <AnomalyTag type={a.type} severity={a.severity} />
                    {a.fieldName && <span className="text-[10px] text-hall-textMute font-mono">{a.fieldName}</span>}
                  </div>
                  <div className="text-[11px] text-hall-textDim">{a.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-hall-textMute text-xs mb-1.5">最近处理</div>
          {record.processNotes.length === 0 ? (
            <div className="text-[11px] text-hall-textMute/70">暂无处理记录</div>
          ) : (
            <div className="p-2 rounded border border-hall-border bg-hall-bg/50">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-medium">{record.processNotes[0].author}</span>
                <span className="text-[10px] text-hall-textMute">{formatDateTime(record.processNotes[0].createdAt)}</span>
              </div>
              <div className="text-[11px] text-hall-textDim">{record.processNotes[0].content}</div>
              <div className="mt-1.5">
                <StatusBadge status={record.processNotes[0].statusAfter} />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
