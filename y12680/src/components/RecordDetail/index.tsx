import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Save,
  RotateCcw,
  Camera,
  FileText,
  Image,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  StickyNote,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { AnomalyBadge } from '@/components/AnomalyBadge';
import { formatDate } from '@/utils/storage';
import { getAnomalyLabel } from '@/utils/anomalyDetector';
import type { ReviewStatus, CameraAngle } from '@/types';

export function RecordDetail() {
  const navigate = useNavigate();
  const {
    selectedRecordId,
    getRecordById,
    setSelectedRecord,
    setDetailPanelOpen,
    updateReviewStatus,
    saveCameraAngle,
    updateProcessingOpinion,
    isDetailPanelOpen,
  } = useAppStore();

  const record = selectedRecordId ? getRecordById(selectedRecordId) : undefined;

  const [editingOpinion, setEditingOpinion] = useState(false);
  const [opinionText, setOpinionText] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [angleInput, setAngleInput] = useState<CameraAngle>({
    azimuth: 0,
    elevation: 0,
    distance: 0,
  });
  const [angleModified, setAngleModified] = useState(false);

  useEffect(() => {
    if (record) {
      setOpinionText(record.processingOpinion || '');
      setEditingOpinion(false);
      setStatusNote(record.reviewNote || '');
      setAngleInput(
        record.cameraAngle || { azimuth: 0, elevation: 0, distance: 0 },
      );
      setAngleModified(false);
    }
  }, [record?.id]);

  if (!isDetailPanelOpen || !record) {
    return null;
  }

  const handleChangeStatus = (status: ReviewStatus) => {
    updateReviewStatus(record.id, status, statusNote || undefined);
  };

  const handleSaveOpinion = () => {
    updateProcessingOpinion(record.id, opinionText);
    setEditingOpinion(false);
  };

  const handleSaveAngle = () => {
    saveCameraAngle(record.id, angleInput);
    setAngleModified(false);
  };

  const handleRestoreAngle = () => {
    if (record.cameraAngle) {
      setAngleInput(record.cameraAngle);
      setAngleModified(false);
    }
  };

  const handleAngleChange = (key: keyof CameraAngle, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setAngleInput((prev) => ({ ...prev, [key]: num }));
      setAngleModified(true);
    }
  };

  const hasCameraAngle = !!record.cameraAngle;

  return (
    <div className="flex h-full w-[440px] flex-col border-l border-pocket-border bg-pocket-card fade-in">
      <div className="flex items-center justify-between border-b border-pocket-border px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-pocket-accent" />
          <h2 className="text-sm font-semibold text-pocket-text">记录详情</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/record/${record.id}`)}
            className="flex h-7 items-center gap-1 rounded px-2 text-[11px] text-pocket-muted hover:bg-pocket-border hover:text-pocket-text"
            title="打开独立详情页"
          >
            <ExternalLink size={12} />
            独立页面
          </button>
          <button
            onClick={() => setDetailPanelOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded text-pocket-muted hover:bg-pocket-border hover:text-pocket-text"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-pocket-muted">
                  #{record.originalRowNumber.toString().padStart(3, '0')}
                </span>
                <h3 className="text-base font-semibold text-pocket-text">
                  {record.proteinName || <span className="text-pocket-red">未命名蛋白</span>}
                </h3>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-pocket-muted">
                ID: {record.id}
              </p>
            </div>
            <StatusBadge status={record.reviewStatus} size="md" />
          </div>

          <div className="rounded-md border border-pocket-border bg-pocket-bg p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-pocket-muted">
              <AlertTriangle size={11} />
              异常检测结果
            </div>
            {record.anomalyType ? (
              <div className="space-y-1.5">
                <AnomalyBadge type={record.anomalyType} />
                {record.anomalyNote && (
                  <p className="text-[11px] text-pocket-muted">{record.anomalyNote}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-pocket-green">
                <CheckCircle size={12} />
                无异常，数据完整
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-medium text-pocket-muted">评审状态</div>
            <div className="flex gap-1.5">
              {(['usable', 'pending', 'unusable'] as ReviewStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleChangeStatus(status)}
                  className={clsx(
                    'flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors',
                    record.reviewStatus === status
                      ? status === 'usable'
                        ? 'border-pocket-green/40 bg-pocket-green/10 text-pocket-green'
                        : status === 'pending'
                          ? 'border-pocket-yellow/40 bg-pocket-yellow/10 text-pocket-yellow'
                          : 'border-pocket-red/40 bg-pocket-red/10 text-pocket-red'
                      : 'border-pocket-border bg-pocket-bg text-pocket-muted hover:border-pocket-accent/30 hover:text-pocket-text',
                  )}
                >
                  {status === 'usable' && <><CheckCircle size={11} className="inline mr-1" />可直接使用</>}
                  {status === 'pending' && <><AlertTriangle size={11} className="inline mr-1" />待复核</>}
                  {status === 'unusable' && <><XCircle size={11} className="inline mr-1" />不可用</>}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="评审备注（可选）"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              onBlur={() => handleChangeStatus(record.reviewStatus)}
              className="h-7 w-full rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-[11px] text-pocket-text placeholder:text-pocket-muted focus:border-pocket-accent/50 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-pocket-muted">
              <Camera size={11} />
              相机视角参数
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-pocket-muted">方位角 (azimuth)</label>
                <input
                  type="number"
                  value={angleInput.azimuth}
                  onChange={(e) => handleAngleChange('azimuth', e.target.value)}
                  className="h-7 w-full rounded-md border border-pocket-border bg-pocket-bg px-2 text-[11px] text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-pocket-muted">仰角 (elevation)</label>
                <input
                  type="number"
                  value={angleInput.elevation}
                  onChange={(e) => handleAngleChange('elevation', e.target.value)}
                  className="h-7 w-full rounded-md border border-pocket-border bg-pocket-bg px-2 text-[11px] text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-pocket-muted">距离 (distance)</label>
                <input
                  type="number"
                  value={angleInput.distance}
                  onChange={(e) => handleAngleChange('distance', e.target.value)}
                  className="h-7 w-full rounded-md border border-pocket-border bg-pocket-bg px-2 text-[11px] text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handleSaveAngle}
                disabled={!angleModified}
                className={clsx(
                  'flex h-7 flex-1 items-center justify-center gap-1 rounded-md border text-[11px] font-medium',
                  angleModified
                    ? 'border-pocket-accent/40 bg-pocket-accent/10 text-pocket-accent hover:bg-pocket-accent/20'
                    : 'border-pocket-border bg-pocket-bg text-pocket-muted',
                )}
              >
                <Save size={11} />
                保存视角
              </button>
              <button
                onClick={handleRestoreAngle}
                disabled={!hasCameraAngle}
                className={clsx(
                  'flex h-7 flex-1 items-center justify-center gap-1 rounded-md border text-[11px] font-medium',
                  hasCameraAngle
                    ? 'border-pocket-border bg-pocket-bg text-pocket-text hover:border-pocket-accent/30'
                    : 'border-pocket-border bg-pocket-bg text-pocket-muted',
                )}
              >
                <RotateCcw size={11} />
                恢复已保存
              </button>
            </div>
            {!hasCameraAngle && (
              <p className="text-[10px] text-pocket-red">
                ⚠ 此记录暂无已保存的相机视角
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-[10px] text-pocket-muted">口袋坐标</div>
              <div className="font-mono text-xs text-pocket-text">
                x: {record.pocketCoordinates.x.toFixed(2)}
              </div>
              <div className="font-mono text-xs text-pocket-text">
                y: {record.pocketCoordinates.y.toFixed(2)}
              </div>
              <div className="font-mono text-xs text-pocket-text">
                z: {record.pocketCoordinates.z.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] text-pocket-muted">亲和力</div>
              <div className="font-mono text-lg font-semibold text-pocket-accent">
                {record.affinity.toFixed(1)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-pocket-muted">
                <StickyNote size={11} />
                处理意见
              </div>
              {editingOpinion ? (
                <button
                  onClick={handleSaveOpinion}
                  className="flex items-center gap-1 text-[10px] text-pocket-accent hover:underline"
                >
                  <Save size={10} />
                  保存
                </button>
              ) : (
                <button
                  onClick={() => setEditingOpinion(true)}
                  className="text-[10px] text-pocket-muted hover:text-pocket-accent"
                >
                  编辑
                </button>
              )}
            </div>
            {editingOpinion ? (
              <textarea
                value={opinionText}
                onChange={(e) => setOpinionText(e.target.value)}
                rows={3}
                placeholder="输入处理意见..."
                className="w-full rounded-md border border-pocket-border bg-pocket-bg p-2.5 text-[11px] text-pocket-text placeholder:text-pocket-muted focus:border-pocket-accent/50 focus:outline-none"
              />
            ) : (
              <div className="min-h-[48px] rounded-md border border-pocket-border bg-pocket-bg p-2.5 text-[11px] text-pocket-text">
                {opinionText || <span className="text-pocket-muted">暂无处理意见，点击"编辑"添加</span>}
              </div>
            )}
          </div>

          <div className="rounded-md border border-pocket-border bg-pocket-bg p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-pocket-muted">
              <FileText size={11} />
              来源追溯信息
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-pocket-muted">来源文件</span>
                <span className="font-mono text-pocket-text">{record.sourceFile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pocket-muted">原始行号</span>
                <span className="font-mono text-pocket-accent">第 {record.originalRowNumber} 行</span>
              </div>
              {record.imageName && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-pocket-muted">
                    <Image size={10} />
                    关联图片
                  </span>
                  <span className="font-mono text-pocket-accent">{record.imageName}</span>
                </div>
              )}
              {record.sourceNote && (
                <div>
                  <span className="text-pocket-muted">来源备注</span>
                  <p className="mt-0.5 rounded border border-pocket-border p-1.5 text-pocket-text">
                    {record.sourceNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 text-[10px] text-pocket-muted">
            <div className="flex items-center gap-1.5">
              <Clock size={10} />
              创建: {formatDate(record.createdAt)}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={10} />
              更新: {formatDate(record.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
