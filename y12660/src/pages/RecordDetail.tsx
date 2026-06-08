import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useRecordsStore } from '@/store/records';
import { StatusBadge } from '@/components/common/Badges';
import { SourceMaterialPanel } from '@/components/record/SourceMaterialPanel';
import { AnomalyListPanel } from '@/components/record/AnomalyListPanel';
import { ProcessNotesPanel } from '@/components/record/ProcessNotesPanel';
import { ParamLinkagePanel } from '@/components/record/ParamLinkagePanel';
import { HallScene } from '@/components/three/HallScene';
import { EmptyState } from '@/components/common/Badges';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const records = useRecordsStore((s) => s.records);
  const batches = useRecordsStore((s) => s.batches);
  const initializeIfNeeded = useRecordsStore((s) => s.initializeIfNeeded);

  useEffect(() => {
    initializeIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const record = records.find((r) => r.id === id);
  const batch = record ? batches.find((b) => b.id === record.batchId) : undefined;

  if (!record) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-12 shrink-0 border-b border-hall-border bg-hall-bg2/60 flex items-center px-5 gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-ghost !px-2 !py-1">
            <ArrowLeft size={14} /> 返回
          </button>
          <span className="text-sm font-medium text-hall-text">记录详情</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState title="未找到该记录" desc="记录可能已被删除，或 ID 不正确" />
        </div>
      </div>
    );
  }

  const cameraLost = !record.cameraView || record.cameraView.isValid === false;

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 shrink-0 border-b border-hall-border bg-hall-bg2/60 flex items-center px-5 gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost !px-2 !py-1">
          <ArrowLeft size={14} /> 返回
        </button>
        <div className="font-mono text-xs text-hall-textDim">{record.id}</div>
        <div className="text-sm font-medium text-hall-text">{record.deviceCode}</div>
        <StatusBadge status={record.availabilityStatus} />
        {cameraLost && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border border-status-unusable/40 text-status-unusable bg-status-unusable/10">
            相机视角丢失
          </span>
        )}
        <div className="ml-auto text-[11px] text-hall-textMute">
          来源批次：<span className="text-hall-textDim">{batch?.name ?? '—'}</span>
          <Link to="/" className="ml-3 inline-flex items-center gap-1 hover:text-hall-accent">
            <ExternalLink size={11} /> 返回工作台
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-[520px] shrink-0 border-r border-hall-border overflow-y-auto p-4 space-y-4 bg-hall-bg/40">
          <SourceMaterialPanel record={record} batchName={batch?.name} batchDate={batch?.importedAt} />
          <AnomalyListPanel anomalies={record.anomalies} />
          <ParamLinkagePanel record={record} />
          <ProcessNotesPanel record={record} />
        </div>
        <div className="flex-1 min-w-0 p-4">
          <HallScene record={record} />
        </div>
      </div>
    </div>
  );
}
