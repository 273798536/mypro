import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWorkbench } from '../store/workbench';
import SectionViewer from '../components/SectionViewer';
import ParameterPanel from '../components/ParameterPanel';
import ComparePanel from '../components/ComparePanel';
import ReviewBar from '../components/ReviewBar';
import type { ProcessingRecord } from '../../shared/types';
import { formatDateTime, statusLabel, statusClass, riskLabel, riskClass } from '../utils';
import { Save, History, FileDown, AlertTriangle } from 'lucide-react';

export default function SnapshotPage() {
  const { id } = useParams<{ id: string }>();
  const { currentSnapshot, currentRecord, history, loadSnapshot, loadLatestRecord, saveRecord, loadHistory, submitReview } = useWorkbench();
  const [draft, setDraft] = useState<Partial<ProcessingRecord>>({});

  useEffect(() => {
    if (id) {
      loadSnapshot(id);
      loadLatestRecord(id);
      loadHistory(id);
    }
  }, [id]);

  const effectiveRecord: ProcessingRecord = {
    id: currentRecord?.id ?? 'draft',
    snapshotId: id ?? '',
    sectionData: draft.sectionData ?? currentRecord?.sectionData ?? null,
    coordinates: draft.coordinates ?? currentRecord?.coordinates ?? null,
    dimensions: draft.dimensions ?? currentRecord?.dimensions ?? null,
    conversions: draft.conversions ?? currentRecord?.conversions ?? [],
    riskNotes: draft.riskNotes ?? currentRecord?.riskNotes ?? '',
    conclusion: draft.conclusion ?? currentRecord?.conclusion ?? '',
    operator: currentRecord?.operator ?? '舞台统筹',
    createdAt: currentRecord?.createdAt ?? new Date().toISOString(),
  };

  const handleChange = (data: Partial<ProcessingRecord>) => {
    setDraft((prev) => ({ ...prev, ...data }));
  };

  const handleSave = async () => {
    if (!id) return;
    await saveRecord(id, effectiveRecord);
    setDraft({});
  };

  const handleSubmit = async (data: any) => {
    await submitReview({ ...data, processingRecord: effectiveRecord });
    setDraft({});
  };

  if (!currentSnapshot) {
    return (
      <div className="h-[calc(100vh-3.5rem-2rem)] flex items-center justify-center text-charcoal-500">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem-2rem)] flex flex-col pb-20">
      <div className="px-6 py-3 border-b border-charcoal-800 bg-charcoal-900/60 flex items-center gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-alert-orange">{currentSnapshot.code}</span>
            <span className={`badge ${statusClass(currentSnapshot.status)}`}>{statusLabel(currentSnapshot.status)}</span>
            <span className={`badge border ${riskClass(currentSnapshot.riskLevel)}`}>
              {currentSnapshot.riskLevel === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
              风险 {riskLabel(currentSnapshot.riskLevel)}
            </span>
          </div>
          <h1 className="text-lg font-medium text-white mt-1">{currentSnapshot.deviceName}</h1>
        </div>
        <div className="flex-1" />
        <div className="text-xs text-charcoal-500 font-mono">
          最后操作：{currentSnapshot.lastOperator} · {formatDateTime(currentSnapshot.updatedAt)}
        </div>
        <Link to={`/snapshot/${id}/history`} className="btn-ghost">
          <History className="w-4 h-4" /> 历史版本
        </Link>
        <Link to={`/report/${id}`} className="btn-ghost">
          <FileDown className="w-4 h-4" /> 导出报告
        </Link>
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" /> 保存草稿
        </button>
      </div>
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0">
        <div className="col-span-5 min-h-0">
          <SectionViewer
            imagePath={currentSnapshot.imagePath}
            record={effectiveRecord}
            onChange={(s) => handleChange({ sectionData: s })}
          />
        </div>
        <div className="col-span-3 min-h-0">
          <ParameterPanel record={effectiveRecord} onChange={handleChange} />
        </div>
        <div className="col-span-4 min-h-0">
          <ComparePanel currentRecord={effectiveRecord} history={history} />
        </div>
      </div>
      {id && currentRecord && (
        <ReviewBar snapshotId={id} record={effectiveRecord} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
