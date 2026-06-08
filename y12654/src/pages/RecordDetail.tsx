import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  Stethoscope,
  AlertTriangle,
  FileWarning,
  Wrench,
  Save,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Scene3D from '@/components/Scene3D';
import AnomalyLegend from '@/components/AnomalyLegend';
import ViewpointList from '@/components/ViewpointList';
import AnomalyTag from '@/components/AnomalyTag';
import StatusTag from '@/components/StatusTag';
import {
  ANOMALY_TYPE_LABEL,
  PROCESS_STATUS_LABEL,
  ANOMALY_COLORS,
  type AnomalyDetail,
  type ProcessStatus,
  type SavedViewpoint,
} from '@/types';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    records,
    getRecordById,
    getViewpointsByRecordId,
    updateRiskRemarks,
    updateDecision,
    updateManualNote,
    saveViewpoint,
    renameViewpoint,
    deleteViewpoint,
    flashAnomalyId,
    versions,
  } = useAppStore();

  const record = useMemo(() => (id ? getRecordById(id) : undefined), [id, getRecordById, records]);
  const viewpoints = useMemo(() => (id ? getViewpointsByRecordId(id) : []), [id, getViewpointsByRecordId]);

  const [riskRemarks, setRiskRemarks] = useState(record?.opinion.riskRemarks ?? '');
  const [manualNote, setManualNote] = useState(record?.opinion.manualNote ?? '');
  const [decision, setDecision] = useState<ProcessStatus | null>(record?.opinion.decision ?? null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [targetViewpoint, setTargetViewpoint] = useState<SavedViewpoint | null>(null);

  const cameraGetterRef = useRef<(() => { position: [number, number, number]; target: [number, number, number] } | null)>(null);

  useEffect(() => {
    if (!record) return;
    setRiskRemarks(record.opinion.riskRemarks);
    setManualNote(record.opinion.manualNote);
    setDecision(record.opinion.decision);
  }, [record]);

  if (!record) {
    return (
      <div className="min-h-screen bg-surface-800 flex flex-col items-center justify-center text-surface-300">
        <p className="text-sm mb-4">记录不存在</p>
        <Link to="/records" className="btn-secondary">返回列表</Link>
      </div>
    );
  }

  const version = versions.find((v) => v.id === record.runId);
  const firstAnomaly = record.anomalies[0];

  const handleSaveRiskRemarks = () => {
    if (!id || !firstAnomaly) return;
    updateRiskRemarks(id, riskRemarks, firstAnomaly.id);
  };

  const handleSaveDecision = (d: ProcessStatus) => {
    if (!id) return;
    setDecision(d);
    updateDecision(id, d);
  };

  const handleSaveManualNote = () => {
    if (!id) return;
    updateManualNote(id, manualNote);
  };

  const handleSaveViewpoint = (name: string) => {
    if (!id) return;
    const cam = cameraGetterRef.current?.();
    if (!cam) return;
    saveViewpoint({ name, recordId: id, camera: cam });
  };

  const handleMarkerClick = (a: AnomalyDetail) => {
    setSelectedAnomalyId((cur) => (cur === a.id ? null : a.id));
  };

  return (
    <div className="min-h-screen bg-surface-800 text-surface-100 flex flex-col">
      {/* Header */}
      <header className="bg-surface-900 border-b border-surface-600 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost flex items-center gap-1 text-surface-200"
          >
            <ArrowLeft size={16} />
            返回
          </button>
          <div className="w-px h-5 bg-surface-600" />
          <div>
            <h1 className="font-mono text-base font-bold text-surface-50 flex items-center gap-2">
              {record.id}
              {version && (
                <span className="text-[10px] font-normal text-surface-400">
                  {version.label} · {version.timestamp}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-surface-400">
              测量复核详情 · {record.anomalies.length} 个异常
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {record.anomalies.map((a) => (
              <AnomalyTag key={a.id} type={a.type} />
            ))}
          </div>
          {record.opinion.decision && <StatusTag status={record.opinion.decision} />}
        </div>
      </header>

      {/* Main content - two columns */}
      <div className="flex-1 flex min-h-0">
        {/* Left column - details */}
        <div className="w-[440px] shrink-0 border-r border-surface-600 bg-surface-850 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Source */}
            <section className="card p-4">
              <h3 className="label-text flex items-center gap-1.5 mb-3">
                <Database size={12} />
                来源追溯
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <dt className="text-surface-400">上游 ID</dt>
                  <dd className="font-mono text-surface-100">{record.source.upstreamId}</dd>
                </div>
                <div>
                  <dt className="text-surface-400">采集时间</dt>
                  <dd className="font-mono text-surface-100">{record.source.collectedAt}</dd>
                </div>
                <div>
                  <dt className="text-surface-400">采集设备</dt>
                  <dd className="text-surface-100">{record.source.device}</dd>
                </div>
                <div>
                  <dt className="text-surface-400">操作员</dt>
                  <dd className="text-surface-100">{record.source.operator}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-surface-400">拼装段位置</dt>
                  <dd className="text-surface-100">{record.source.location}</dd>
                </div>
              </dl>
            </section>

            {/* Processing opinion */}
            <section className="card p-4">
              <h3 className="label-text flex items-center gap-1.5 mb-3">
                <Stethoscope size={12} />
                处理意见
              </h3>

              <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-sm">
                <div className="text-[10px] text-primary-300 mb-1 flex items-center gap-1">
                  <Wrench size={10} /> 系统建议
                </div>
                <p className="text-sm text-surface-100">{record.opinion.systemSuggestion}</p>
              </div>

              <div className="mb-4">
                <label className="label-text block mb-1.5">人工备注</label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  onBlur={handleSaveManualNote}
                  rows={2}
                  placeholder="填写人工复核备注..."
                  className="input-field w-full text-xs resize-y"
                />
              </div>

              <div>
                <label className="label-text block mb-2">复核决定（下一步行动）</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['need_material', 'need_calibration', 'resolved'] as ProcessStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSaveDecision(s)}
                      className={`px-2 py-2 rounded-sm text-xs font-medium transition-all ${
                        decision === s
                          ? s === 'resolved'
                            ? 'bg-success-500 text-white'
                            : s === 'need_calibration'
                            ? 'bg-primary-500 text-white'
                            : 'bg-warning-500 text-white'
                          : 'bg-surface-700 text-surface-200 border border-surface-500 hover:border-surface-400'
                      }`}
                    >
                      {PROCESS_STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Anomaly details */}
            <section className="card p-4">
              <h3 className="label-text flex items-center gap-1.5 mb-3">
                <AlertTriangle size={12} />
                异常明细（{record.anomalies.length}）
              </h3>
              <div className="space-y-3">
                {record.anomalies.map((a, idx) => {
                  const c = ANOMALY_COLORS[a.type];
                  return (
                    <div
                      key={a.id}
                      className="p-3 bg-surface-800/60 border border-surface-600 rounded-sm"
                      style={{ borderLeftColor: c.hex, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 flex items-center justify-center rounded-sm font-mono text-xs font-bold text-white"
                            style={{ backgroundColor: c.hex }}
                          >
                            {idx + 1}
                          </span>
                          <AnomalyTag type={a.type} />
                          <StatusTag status={a.status} />
                        </div>
                      </div>
                      <div className="text-xs text-surface-200 mb-2 font-medium">{a.partName}</div>
                      <div className="text-[11px] text-surface-400 mb-2">{a.description}</div>
                      <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                        <div>
                          <div className="text-surface-400">实测</div>
                          <div className="text-surface-100">{a.measuredValue}</div>
                        </div>
                        <div>
                          <div className="text-surface-400">标准</div>
                          <div className="text-surface-100">{a.standardValue}</div>
                        </div>
                        <div>
                          <div className="text-surface-400">偏差</div>
                          <div style={{ color: c.hex }}>
                            {a.deviation > 0 ? '+' : ''}{a.deviation}
                          </div>
                        </div>
                        <div>
                          <div className="text-surface-400">阈值</div>
                          <div className="text-surface-100">{a.threshold}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-surface-500">
                        3D 坐标: ({a.position3d.x}, {a.position3d.y}, {a.position3d.z})
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Risk remarks */}
            <section className="card p-4">
              <h3 className="label-text flex items-center gap-1.5 mb-3">
                <FileWarning size={12} />
                风险备注
              </h3>
              <p className="text-[11px] text-surface-400 mb-2">
                补录风险备注后，3D 视图中的异常标记会同步闪烁更新，并带上 ★ 标识。
              </p>
              <textarea
                value={riskRemarks}
                onChange={(e) => setRiskRemarks(e.target.value)}
                rows={4}
                placeholder="描述风险点、复核结论、特殊说明..."
                className="input-field w-full text-xs resize-y mb-2"
              />
              <button
                onClick={handleSaveRiskRemarks}
                className="btn-primary text-xs flex items-center gap-1.5 w-full justify-center"
              >
                <Save size={13} />
                保存并更新 3D 标注
              </button>
            </section>
          </div>
        </div>

        {/* Right column - 3D view */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 min-w-0">
              <Scene3D
                anomalies={record.anomalies}
                flashAnomalyId={flashAnomalyId}
                riskRemarks={record.opinion.riskRemarks}
                targetViewpoint={targetViewpoint}
                onViewpointApplied={() => setTargetViewpoint(null)}
                onMarkerClick={handleMarkerClick}
                registerCameraGetter={(fn) => { cameraGetterRef.current = fn; }}
              />
            </div>

            <div className="w-[300px] shrink-0 border-l border-surface-600 bg-surface-750 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <AnomalyLegend
                  anomalies={record.anomalies}
                  selectedAnomalyId={selectedAnomalyId}
                  onSelect={setSelectedAnomalyId}
                />
                <div className="divider -mx-2" />
                <ViewpointList
                  viewpoints={viewpoints}
                  onSelect={(vp) => setTargetViewpoint(vp)}
                  onRename={renameViewpoint}
                  onDelete={deleteViewpoint}
                  onSaveNew={handleSaveViewpoint}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
