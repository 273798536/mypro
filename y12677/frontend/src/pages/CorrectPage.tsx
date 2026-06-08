import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import type { TimeParameters, UnitConversionError, RecordStatus } from '../types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatInputDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function recalcConclusion(
  tp: TimeParameters,
  uce: UnitConversionError,
  records: { displacement: number }[]
): string {
  const hasError = uce.hasError;
  const avgDisplacement = records.reduce((sum, r) => sum + Math.abs(r.displacement), 0) / (records.length || 1);

  if (hasError) {
    return `存在单位换算错误待复核，原始平均位移${avgDisplacement.toFixed(3)}mm，需修正后重新评估。`;
  }
  if (avgDisplacement > 2) {
    return `管片错缝位移均值${avgDisplacement.toFixed(3)}mm，超出预警阈值${(avgDisplacement - 2).toFixed(3)}mm，需关注。`;
  }
  return `管片状态正常，平均错缝位移${avgDisplacement.toFixed(3)}mm，在安全范围内。`;
}

function FieldDiff({ label, oldVal, newVal, changed }: {
  label: string;
  oldVal: any;
  newVal: any;
  changed: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${changed ? 'bg-warning/10 border border-warning/30' : 'bg-gray-50 border border-border-light'}`}>
      <p className="text-xs text-text-gray mb-1">{label}</p>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-gray mb-0.5">原值</p>
          <p className={`text-sm font-medium truncate ${changed ? 'line-through text-text-gray' : 'text-text-dark'}`}>
            {String(oldVal)}
          </p>
        </div>
        {changed && (
          <svg className="w-4 h-4 text-warning mt-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        )}
        {changed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary mb-0.5">新值</p>
            <p className="text-sm font-medium text-primary truncate">{String(newVal)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CorrectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRecord, loading, error, fetchRecord, updateRecord, clearCurrent } = useAppStore();

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [samplingInterval, setSamplingInterval] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [newStatus, setNewStatus] = useState<RecordStatus>('pending');
  const [modifier, setModifier] = useState('展馆讲解员');
  const [modificationReason, setModificationReason] = useState('');
  const [processingOpinion, setProcessingOpinion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchRecord(id);
    return () => clearCurrent();
  }, [id, fetchRecord, clearCurrent]);

  useEffect(() => {
    if (currentRecord) {
      setStartTime(formatInputDate(currentRecord.timeParameters.startTime));
      setEndTime(formatInputDate(currentRecord.timeParameters.endTime));
      setSamplingInterval(currentRecord.timeParameters.samplingInterval);
      setHasError(currentRecord.unitConversionError.hasError);
      setErrorDescription(currentRecord.unitConversionError.description);
      setErrorDetails(currentRecord.unitConversionError.errorDetails.join('\n'));
      setNewStatus(currentRecord.status);
    }
  }, [currentRecord]);

  const newTP: TimeParameters = useMemo(() => {
    const toISO = (s: string) => (s ? new Date(s).toISOString() : '');
    return {
      startTime: toISO(startTime) || currentRecord?.timeParameters.startTime || '',
      endTime: toISO(endTime) || currentRecord?.timeParameters.endTime || '',
      samplingInterval: Number(samplingInterval) || 0
    };
  }, [startTime, endTime, samplingInterval, currentRecord]);

  const newUCE: UnitConversionError = useMemo(() => ({
    hasError,
    description: errorDescription,
    errorDetails: errorDetails.split('\n').map(s => s.trim()).filter(Boolean)
  }), [hasError, errorDescription, errorDetails]);

  const newConclusion = useMemo(() => {
    if (!currentRecord) return '';
    return recalcConclusion(newTP, newUCE, currentRecord.processingRecords);
  }, [newTP, newUCE, currentRecord]);

  const diffs = useMemo(() => {
    if (!currentRecord) return [];
    const result: { label: string; field: string; oldValue: any; newValue: any; changed: boolean }[] = [];
    result.push({
      label: '起始时间',
      field: 'timeParameters.startTime',
      oldValue: formatDate(currentRecord.timeParameters.startTime),
      newValue: formatDate(newTP.startTime),
      changed: currentRecord.timeParameters.startTime !== newTP.startTime
    });
    result.push({
      label: '结束时间',
      field: 'timeParameters.endTime',
      oldValue: formatDate(currentRecord.timeParameters.endTime),
      newValue: formatDate(newTP.endTime),
      changed: currentRecord.timeParameters.endTime !== newTP.endTime
    });
    result.push({
      label: '采样间隔 (秒)',
      field: 'timeParameters.samplingInterval',
      oldValue: currentRecord.timeParameters.samplingInterval,
      newValue: newTP.samplingInterval,
      changed: currentRecord.timeParameters.samplingInterval !== newTP.samplingInterval
    });
    result.push({
      label: '存在单位换算错误',
      field: 'unitConversionError.hasError',
      oldValue: currentRecord.unitConversionError.hasError ? '是' : '否',
      newValue: newUCE.hasError ? '是' : '否',
      changed: currentRecord.unitConversionError.hasError !== newUCE.hasError
    });
    result.push({
      label: '错误描述',
      field: 'unitConversionError.description',
      oldValue: currentRecord.unitConversionError.description || '(无)',
      newValue: newUCE.description || '(无)',
      changed: currentRecord.unitConversionError.description !== newUCE.description
    });
    result.push({
      label: '记录状态',
      field: 'status',
      oldValue: { pending: '待复核', reviewed: '已复核', approved: '已通过' }[currentRecord.status],
      newValue: { pending: '待复核', reviewed: '已复核', approved: '已通过' }[newStatus],
      changed: currentRecord.status !== newStatus
    });
    result.push({
      label: '分析结论',
      field: 'conclusion',
      oldValue: currentRecord.conclusion,
      newValue: newConclusion,
      changed: currentRecord.conclusion !== newConclusion
    });
    return result;
  }, [currentRecord, newTP, newUCE, newStatus, newConclusion]);

  const changedCount = diffs.filter(d => d.changed).length;

  const handleSubmit = async () => {
    if (!id || !currentRecord) return;
    if (!modificationReason.trim()) {
      alert('请填写修改原因');
      return;
    }
    if (!processingOpinion.trim()) {
      alert('请填写处理意见');
      return;
    }
    setSubmitting(true);
    try {
      await updateRecord(id, {
        timeParameters: newTP,
        unitConversionError: newUCE,
        status: newStatus,
        modifier,
        modificationReason,
        processingOpinion
      });
      navigate(`/record/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !currentRecord) return <Loading message="加载记录..." />;
  if (error && !currentRecord) return <ErrorAlert message={error} />;
  if (!currentRecord) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-dark mb-1">修正参数与复核对比</h1>
          <p className="text-text-gray text-sm">
            记录编号：{currentRecord.id} · 修改的字段将以橙色高亮标记
          </p>
        </div>
        <Link
          to={`/record/${currentRecord.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-border-light bg-white text-text-dark rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 19l-7-7 7-7" />
          </svg>
          返回详情
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
          <div className="px-5 py-3 border-b border-border-light bg-gray-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-text-gray"></div>
            <h2 className="font-semibold text-text-dark">原始参数 (修改前)</h2>
          </div>
          <div className="p-5 space-y-4 text-sm">
            <div className="bg-info-bg rounded-lg p-3 space-y-2">
              <p className="text-text-gray text-xs mb-1">时间参数</p>
              <div className="flex justify-between">
                <span className="text-text-gray">起始时间</span>
                <span className="text-text-dark font-medium">{formatDate(currentRecord.timeParameters.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-gray">结束时间</span>
                <span className="text-text-dark font-medium">{formatDate(currentRecord.timeParameters.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-gray">采样间隔</span>
                <span className="text-text-dark font-medium">{currentRecord.timeParameters.samplingInterval} 秒</span>
              </div>
            </div>

            <div>
              <p className="text-text-gray text-xs mb-1">单位换算检查</p>
              {currentRecord.unitConversionError.hasError ? (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                  <p className="text-warning font-medium text-sm mb-1">存在错误</p>
                  <p className="text-text-dark text-sm">{currentRecord.unitConversionError.description}</p>
                  {currentRecord.unitConversionError.errorDetails.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {currentRecord.unitConversionError.errorDetails.map((d, i) => (
                        <li key={i} className="text-text-gray text-xs flex gap-1.5">
                          <span className="text-warning">•</span>{d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                  单位换算正确，无异常
                </div>
              )}
            </div>

            <div>
              <p className="text-text-gray text-xs mb-1">原始结论</p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-text-dark text-sm">{currentRecord.conclusion}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-primary/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <h2 className="font-semibold text-primary">新参数 (修改后)</h2>
            </div>
            {changedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-medium border border-warning/30">
                {changedCount} 项变更
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">时间参数</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-gray mb-1">起始时间</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-gray mb-1">结束时间</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-text-gray mb-1">采样间隔（秒）</label>
                  <input
                    type="number"
                    value={samplingInterval}
                    onChange={e => setSamplingInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-dark mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasError}
                  onChange={e => setHasError(e.target.checked)}
                  className="w-4 h-4 rounded text-warning focus:ring-warning/30"
                />
                存在单位换算错误
              </label>
              <div className={`space-y-3 ${hasError ? '' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <label className="block text-xs text-text-gray mb-1">错误描述</label>
                  <input
                    type="text"
                    value={errorDescription}
                    onChange={e => setErrorDescription(e.target.value)}
                    placeholder="请描述单位换算错误问题"
                    className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-warning"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-gray mb-1">错误明细（每行一条）</label>
                  <textarea
                    value={errorDetails}
                    onChange={e => setErrorDetails(e.target.value)}
                    rows={3}
                    placeholder="每条错误占一行"
                    className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-warning resize-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-1.5">复核后状态</label>
              <div className="flex gap-2">
                {[
                  { value: 'pending', label: '待复核', className: 'border-warning/30 text-warning' },
                  { value: 'reviewed', label: '已复核', className: 'border-blue-300 text-blue-700' },
                  { value: 'approved', label: '审核通过', className: 'border-green-300 text-green-700' }
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex-1 cursor-pointer`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={newStatus === opt.value}
                      onChange={() => setNewStatus(opt.value as RecordStatus)}
                      className="sr-only peer"
                    />
                    <div className={`px-3 py-2 border rounded-lg text-sm text-center transition-colors peer-checked:bg-current peer-checked:text-white ${
                      newStatus === opt.value
                        ? opt.value === 'pending'
                          ? 'bg-warning text-white border-warning'
                          : opt.value === 'reviewed'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-green-600 text-white border-green-600'
                        : `bg-white ${opt.className} hover:bg-gray-50`
                    }`}>
                      {opt.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-xs text-text-gray mb-1">修正后的新结论（预览）</p>
              <p className="text-sm text-green-800 font-medium">{newConclusion}</p>
            </div>
          </div>
        </div>
      </div>

      {changedCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden mt-5">
          <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
            <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="font-semibold text-text-dark">变更摘要</h2>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {diffs.filter(d => d.changed).map(d => (
              <FieldDiff key={d.field} label={d.label} oldVal={d.oldValue} newVal={d.newValue} changed={true} />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden mt-5">
        <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h2 className="font-semibold text-text-dark">复核信息（必填）</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1.5">修改人</label>
            <input
              type="text"
              value={modifier}
              onChange={e => setModifier(e.target.value)}
              className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              修改原因 <span className="text-warning">*</span>
            </label>
            <textarea
              value={modificationReason}
              onChange={e => setModificationReason(e.target.value)}
              rows={2}
              placeholder="请说明为什么修改这些参数（例如：修正毫米与米的单位换算错误）"
              className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-dark mb-1.5">
              处理意见 <span className="text-warning">*</span>
            </label>
            <textarea
              value={processingOpinion}
              onChange={e => setProcessingOpinion(e.target.value)}
              rows={3}
              placeholder="请填写复核处理意见（用于追溯异常时查看审核结论）"
              className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-5">
        <Link
          to={`/record/${currentRecord.id}`}
          className="px-5 py-2.5 border border-border-light bg-white text-text-dark rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          取消
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting || changedCount === 0}
          className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {submitting && (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          )}
          {changedCount === 0 ? '暂未修改任何参数' : `提交修改 (${changedCount} 项)`}
        </button>
      </div>
    </div>
  );
}
