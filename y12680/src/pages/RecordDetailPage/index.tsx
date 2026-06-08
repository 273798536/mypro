import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  FileText,
  Image,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  StickyNote,
  Save,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { AnomalyBadge } from '@/components/AnomalyBadge';
import { formatDate } from '@/utils/storage';
import type { ReviewStatus, CameraAngle } from '@/types';

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { init, getRecordById, updateReviewStatus, saveCameraAngle, updateProcessingOpinion } = useAppStore();
  const [record, setRecord] = useState(() => getRecordById(id || ''));

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRecord(getRecordById(id || ''));
    }, 300);
    return () => clearInterval(interval);
  }, [id]);

  const [editingOpinion, setEditingOpinion] = useState(false);
  const [opinionText, setOpinionText] = useState(record?.processingOpinion || '');
  const [statusNote, setStatusNote] = useState(record?.reviewNote || '');
  const [angleInput, setAngleInput] = useState<CameraAngle>(
    record?.cameraAngle || { azimuth: 0, elevation: 0, distance: 0 },
  );
  const [angleModified, setAngleModified] = useState(false);

  useEffect(() => {
    if (record) {
      setOpinionText(record.processingOpinion || '');
      setStatusNote(record.reviewNote || '');
      setAngleInput(record.cameraAngle || { azimuth: 0, elevation: 0, distance: 0 });
      setAngleModified(false);
    }
  }, [record?.id]);

  if (!record) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-pocket-border bg-pocket-card px-6 py-3">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-pocket-muted hover:text-pocket-text">
            <ArrowLeft size={14} />
            返回数据浏览
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <XCircle size={40} className="mx-auto text-pocket-red" />
            <p className="mt-3 text-sm text-pocket-text">记录不存在或已被删除</p>
            <button
              onClick={() => navigate('/')}
              className="mt-3 rounded-md border border-pocket-border px-3 py-1.5 text-xs text-pocket-muted hover:text-pocket-text"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
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
    <div className="flex h-full flex-col">
      <div className="border-b border-pocket-border bg-pocket-card px-6 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-pocket-muted hover:text-pocket-text">
            <ArrowLeft size={14} />
            返回数据浏览
          </Link>
          <h1 className="text-sm font-semibold text-pocket-text">记录详情 - 独立页面</h1>
          <StatusBadge status={record.reviewStatus} size="md" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-pocket-muted">
                  行号 #{record.originalRowNumber.toString().padStart(3, '0')}
                </span>
                <h2 className="text-xl font-semibold text-pocket-text">
                  {record.proteinName || <span className="text-pocket-red">未命名蛋白</span>}
                </h2>
              </div>
              <p className="mt-1 font-mono text-[11px] text-pocket-muted">ID: {record.id}</p>
            </div>
            <StatusBadge status={record.reviewStatus} size="md" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-pocket-muted">
                  <AlertTriangle size={12} />
                  异常检测结果
                </div>
                {record.anomalyType ? (
                  <div className="space-y-2">
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

              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-pocket-muted">
                  <Camera size={12} />
                  相机视角参数
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] text-pocket-muted">方位角</label>
                    <input
                      type="number"
                      value={angleInput.azimuth}
                      onChange={(e) => handleAngleChange('azimuth', e.target.value)}
                      className="h-8 w-full rounded-md border border-pocket-border bg-pocket-bg px-2 text-xs text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-pocket-muted">仰角</label>
                    <input
                      type="number"
                      value={angleInput.elevation}
                      onChange={(e) => handleAngleChange('elevation', e.target.value)}
                      className="h-8 w-full rounded-md border border-pocket-border bg-pocket-bg px-2 text-xs text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-pocket-muted">距离</label>
                    <input
                      type="number"
                      value={angleInput.distance}
                      onChange={(e) => handleAngleChange('distance', e.target.value)}
                      className="h-8 w-full rounded-md border border-pocket-border bg-pocket-bg px-2 text-xs text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleSaveAngle}
                    disabled={!angleModified}
                    className={clsx(
                      'flex h-8 flex-1 items-center justify-center gap-1 rounded-md border text-[11px] font-medium',
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
                      'flex h-8 flex-1 items-center justify-center gap-1 rounded-md border text-[11px] font-medium',
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
                  <p className="mt-2 text-[10px] text-pocket-red">⚠ 此记录暂无已保存的相机视角</p>
                )}
              </div>

              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-pocket-muted">
                  <StickyNote size={12} />
                  处理意见
                </div>
                <div className="mb-2 flex justify-end">
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
                    rows={4}
                    placeholder="输入处理意见..."
                    className="w-full rounded-md border border-pocket-border bg-pocket-bg p-2.5 text-xs text-pocket-text placeholder:text-pocket-muted focus:border-pocket-accent/50 focus:outline-none"
                  />
                ) : (
                  <div className="min-h-[64px] rounded-md border border-pocket-border bg-pocket-bg p-2.5 text-xs text-pocket-text">
                    {opinionText || <span className="text-pocket-muted">暂无处理意见，点击"编辑"添加</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-3 text-xs font-medium text-pocket-muted">评审状态</div>
                <div className="space-y-1.5">
                  {(['usable', 'pending', 'unusable'] as ReviewStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleChangeStatus(status)}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors',
                        record.reviewStatus === status
                          ? status === 'usable'
                            ? 'border-pocket-green/40 bg-pocket-green/10 text-pocket-green'
                            : status === 'pending'
                              ? 'border-pocket-yellow/40 bg-pocket-yellow/10 text-pocket-yellow'
                              : 'border-pocket-red/40 bg-pocket-red/10 text-pocket-red'
                          : 'border-pocket-border bg-pocket-bg text-pocket-muted hover:border-pocket-accent/30 hover:text-pocket-text',
                      )}
                    >
                      {record.reviewStatus === status && <CheckSquare size={13} />}
                      {status === 'usable' && '✓ 可直接使用 - 数据完整、无异常'}
                      {status === 'pending' && '⚠ 待复核 - 存在轻微异常，需工程师确认'}
                      {status === 'unusable' && '✕ 不可用 - 严重异常，无法使用'}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="评审备注（可选）"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  onBlur={() => handleChangeStatus(record.reviewStatus)}
                  className="mt-3 h-8 w-full rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-xs text-pocket-text placeholder:text-pocket-muted focus:border-pocket-accent/50 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-3 text-xs font-medium text-pocket-muted">核心参数</div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-pocket-muted">口袋 X 坐标</span>
                    <span className="font-mono text-pocket-text">{record.pocketCoordinates.x.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pocket-muted">口袋 Y 坐标</span>
                    <span className="font-mono text-pocket-text">{record.pocketCoordinates.y.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pocket-muted">口袋 Z 坐标</span>
                    <span className="font-mono text-pocket-text">{record.pocketCoordinates.z.toFixed(4)}</span>
                  </div>
                  <div className="my-2 border-t border-pocket-border" />
                  <div className="flex justify-between">
                    <span className="text-pocket-muted">亲和力</span>
                    <span className="font-mono text-lg font-semibold text-pocket-accent">
                      {record.affinity.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-pocket-muted">
                  <FileText size={12} />
                  来源追溯信息
                </div>
                <div className="space-y-2 text-[11px]">
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
                      <p className="mt-1 rounded border border-pocket-border bg-pocket-bg p-2 text-pocket-text">
                        {record.sourceNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
                <div className="mb-2 text-xs font-medium text-pocket-muted">时间戳</div>
                <div className="space-y-1.5 text-[11px] text-pocket-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} />
                    创建：{formatDate(record.createdAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} />
                    更新：{formatDate(record.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
