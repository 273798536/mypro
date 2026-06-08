import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  User,
  Clock,
  FileText,
  Check,
  X,
  AlertTriangle,
  Circle,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  AnomalyTypeBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/Badges';
import { REVIEW_ACTION_LABEL } from '@/types';

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { records, anomalies, reviewActions, reviewAnomaly, batches } =
    useAppStore();

  const [reviewMode, setReviewMode] = useState(false);
  const [reviewReason, setReviewReason] = useState('');
  const [operatorName, setOperatorName] = useState('当前工程师');

  const record = useMemo(() => records.find((r) => r.id === id), [records, id]);
  const recordAnomalies = useMemo(
    () => anomalies.filter((a) => a.recordId === id),
    [anomalies, id]
  );
  const recordReviews = useMemo(() => {
    const ids = new Set(recordAnomalies.map((a) => a.id));
    return reviewActions
      .filter((r) => ids.has(r.anomalyId))
      .sort(
        (a, b) =>
          new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime()
      );
  }, [reviewActions, recordAnomalies]);
  const batch = useMemo(
    () => batches.find((b) => b.id === record?.batchId),
    [batches, record]
  );

  if (!record) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-marine-300 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        <div className="text-marine-400 text-sm">未找到该测量记录</div>
      </div>
    );
  }

  const handleReview = (action: 'APPROVE' | 'REJECT') => {
    if (!reviewReason.trim()) {
      alert('请填写复核原因');
      return;
    }
    recordAnomalies
      .filter((a) => a.status === 'PENDING')
      .forEach((a) => {
        reviewAnomaly(a.id, action, reviewReason, operatorName);
      });
    setReviewMode(false);
    setReviewReason('');
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-marine-300 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回测量记录列表
      </button>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">
            测量记录详情
          </h1>
          <p className="mt-1 text-sm text-marine-300 font-mono">
            {record.cargoNo} · {record.cabinNo} · 批次 {batch?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/3d?record=${record.id}`}
            className="px-3 py-1.5 text-sm bg-marine-700 hover:bg-marine-600 text-white rounded border border-marine-600/50 transition-colors flex items-center gap-1.5"
          >
            <Box className="w-4 h-4" />
            在 3D 中查看
          </Link>
          {recordAnomalies.some((a) => a.status === 'PENDING') && !reviewMode && (
            <button
              onClick={() => setReviewMode(true)}
              className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              复核异常
            </button>
          )}
        </div>
      </div>

      {reviewMode && (
        <div className="border border-amber-500/40 bg-amber-500/10 rounded-lg p-4 mb-5">
          <div className="text-sm font-medium text-amber-200 mb-3">
            复核操作 — 将对 {recordAnomalies.filter((a) => a.status === 'PENDING').length} 项待复核异常进行处理
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-marine-300 mb-1">
                操作人
              </label>
              <input
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2 bg-marine-900/80 border border-marine-700/60 rounded text-sm text-white focus:outline-none focus:border-marine-500"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-marine-300 mb-1">
              复核原因 <span className="text-amber-400">*</span>
              <span className="text-marine-500 ml-2">
                （审计记录中会保留"谁改的、什么时候、为什么"）
              </span>
            </label>
            <textarea
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              rows={3}
              placeholder="请详细说明复核依据和原因，例如：时间轴偏差在工程容许范围内，经核对原始测量日志确认无误..."
              className="w-full px-3 py-2 bg-marine-900/80 border border-marine-700/60 rounded text-sm text-white placeholder:text-marine-500 focus:outline-none focus:border-marine-500 font-sans"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReview('APPROVE')}
              className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded font-medium transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              复核通过
            </button>
            <button
              onClick={() => handleReview('REJECT')}
              className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              驳回
            </button>
            <button
              onClick={() => {
                setReviewMode(false);
                setReviewReason('');
              }}
              className="px-4 py-1.5 text-sm text-marine-300 hover:text-white transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-5">
          <div className="border border-marine-700/50 bg-marine-800/50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-marine-300" />
              <h2 className="text-sm font-semibold text-white">异常信息</h2>
            </div>
            {recordAnomalies.length === 0 ? (
              <div className="text-sm text-marine-400 py-6 text-center">
                该记录未检出异常
              </div>
            ) : (
              <div className="space-y-3">
                {recordAnomalies.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded bg-marine-900/60 border border-marine-700/40"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AnomalyTypeBadge type={a.type} />
                      <SeverityBadge severity={a.severity} />
                      <StatusBadge status={a.status} />
                      <span className="ml-auto text-xs text-marine-500 font-mono">
                        {new Date(a.detectedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-marine-200">{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-marine-700/50 bg-marine-800/50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-4 h-4 text-marine-300" />
              <h2 className="text-sm font-semibold text-white">
                测量记录来源
              </h2>
              <span className="text-xs text-marine-500 ml-2">
                （原始数据快照，不可篡改）
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['货物编号', record.cargoNo, true],
                ['船舱编号', record.cabinNo, false],
                [
                  '坐标 X / Y / Z (m)',
                  `${record.positionX.toFixed(3)} / ${record.positionY.toFixed(3)} / ${record.positionZ.toFixed(3)}`,
                  true,
                ],
                ['重量 (kg)', record.weight.toLocaleString(), true],
                ['体积 (m³)', record.volume.toFixed(3), true],
                ['测量来源', record.measurementSource, false],
                ['测量设备', record.measurementDevice, false],
                [
                  '采集时间',
                  new Date(record.measuredAt).toLocaleString('zh-CN', {
                    hour12: false,
                  }),
                  true,
                ],
                [
                  '入库时间',
                  new Date(record.createdAt).toLocaleString('zh-CN', {
                    hour12: false,
                  }),
                  true,
                ],
                ['所属批次', batch?.name || record.batchId, false],
              ].map(([label, value, mono]) => (
                <div key={label as string}>
                  <div className="text-xs text-marine-400 mb-0.5">{label}</div>
                  <div
                    className={
                      mono ? 'text-sm text-marine-100 font-mono' : 'text-sm text-marine-100'
                    }
                  >
                    {value as string}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded bg-marine-950/70 border border-marine-700/30">
              <div className="text-xs text-marine-500 mb-1">原始报文快照</div>
              <code className="text-xs text-green-300/90 font-mono whitespace-pre-wrap">
                {record.rawDataSnapshot}
              </code>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-5">
          <div className="border border-marine-700/50 bg-marine-800/50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                追溯链路
              </h2>
            </div>
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-marine-700/60"></div>

              <div className="relative mb-5">
                <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-marine-500 border-2 border-marine-800"></div>
                <div className="text-xs text-marine-400 mb-1">
                  <Clock className="inline w-3 h-3 mr-1" />
                  {new Date(record.measuredAt).toLocaleString('zh-CN', {
                    hour12: false,
                  })}
                </div>
                <div className="text-sm text-marine-100 font-medium">
                  测量数据采集
                </div>
                <div className="text-xs text-marine-400 mt-0.5">
                  {record.measurementSource} · {record.measurementDevice}
                </div>
              </div>

              {recordAnomalies.map((a) => (
                <div key={a.id} className="relative mb-5">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-marine-800"></div>
                  <div className="text-xs text-marine-400 mb-1">
                    <Clock className="inline w-3 h-3 mr-1" />
                    {new Date(a.detectedAt).toLocaleString('zh-CN', {
                      hour12: false,
                    })}
                  </div>
                  <div className="text-sm text-marine-100 font-medium flex items-center gap-1.5">
                    检出异常
                    <AnomalyTypeBadge type={a.type} />
                  </div>
                  <div className="text-xs text-marine-300 mt-1">
                    {a.description}
                  </div>
                </div>
              ))}

              {recordReviews.map((r) => (
                <div key={r.id} className="relative mb-5 last:mb-0">
                  <div
                    className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-marine-800 ${
                      r.action === 'APPROVE'
                        ? 'bg-green-500'
                        : r.action === 'REJECT'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                  ></div>
                  <div className="text-xs text-marine-400 mb-1 flex items-center gap-1">
                    <User className="inline w-3 h-3" />
                    {r.operator}
                    <span className="text-marine-600">·</span>
                    <Clock className="inline w-3 h-3" />
                    {new Date(r.operatedAt).toLocaleString('zh-CN', {
                      hour12: false,
                    })}
                  </div>
                  <div className="text-sm text-marine-100 font-medium">
                    {REVIEW_ACTION_LABEL[r.action]}
                  </div>
                  <div className="text-xs text-marine-300 mt-1 bg-marine-900/50 border border-marine-700/40 rounded p-2">
                    <span className="text-marine-400">原因：</span>
                    {r.reason}
                  </div>
                </div>
              ))}

              {recordAnomalies.some((a) => a.status === 'PENDING') && (
                <div className="relative">
                  <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-marine-700 border-2 border-dashed border-marine-500"></div>
                  <div className="text-sm text-marine-400 italic flex items-center gap-1">
                    <Circle className="w-3 h-3" />
                    待复核处理
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border border-marine-700/50 bg-marine-800/50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-marine-300" />
              <h2 className="text-sm font-semibold text-white">处理意见</h2>
            </div>
            {recordReviews.length === 0 ? (
              <div className="text-sm text-marine-400 py-4 text-center">
                暂无处理意见
              </div>
            ) : (
              <div className="space-y-3">
                {recordReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded bg-marine-900/60 border border-marine-700/40"
                  >
                    <div className="flex items-center justify-between text-xs text-marine-400 mb-1.5">
                      <span>{r.operator}</span>
                      <span className="font-mono">
                        {new Date(r.operatedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-sm text-marine-100">{r.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
