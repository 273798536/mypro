import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentRecord,
    loading,
    error,
    selectedTimestamp,
    selectedProcessingRecord,
    fetchRecord,
    selectTimestamp,
    downloadRecord,
    clearCurrent
  } = useAppStore();

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const playTimer = useRef<number | null>(null);

  useEffect(() => {
    if (id) fetchRecord(id);
    return () => {
      clearCurrent();
      setPlaying(false);
      if (playTimer.current) window.clearInterval(playTimer.current);
    };
  }, [id, fetchRecord, clearCurrent]);

  useEffect(() => {
    if (!playing || !currentRecord) {
      if (playTimer.current) {
        window.clearInterval(playTimer.current);
        playTimer.current = null;
      }
      return;
    }
    const records = currentRecord.processingRecords;
    playTimer.current = window.setInterval(() => {
      setPlaying(p => {
        if (!p || !currentRecord) {
          return p;
        }
        const idx = records.findIndex(r => r.timestamp === selectedTimestamp);
        if (idx < 0) {
          selectTimestamp(records[0]?.timestamp || null);
        } else if (idx < records.length - 1) {
          selectTimestamp(records[idx + 1].timestamp);
        } else {
          return false;
        }
        return p;
      });
    }, 1000 / speed);
    return () => {
      if (playTimer.current) window.clearInterval(playTimer.current);
    };
  }, [playing, currentRecord, selectedTimestamp, speed, selectTimestamp]);

  if (loading && !currentRecord) return <Loading message="加载记录详情..." />;
  if (error && !currentRecord) return <ErrorAlert message={error} onRetry={() => id && fetchRecord(id)} />;
  if (!currentRecord) return null;

  const records = currentRecord.processingRecords;
  const currentIdx = records.findIndex(r => r.timestamp === selectedTimestamp);
  const progress = records.length > 1 ? (currentIdx / (records.length - 1)) * 100 : 0;

  const handleDownload = () => {
    if (id) downloadRecord(id);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text-dark">{currentRecord.id}</h1>
            <StatusBadge status={currentRecord.status} />
          </div>
          <p className="text-text-gray text-sm">运行时间：{formatDate(currentRecord.runTime)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/record/${currentRecord.id}/history`}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border-light bg-white text-text-dark rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            修改历史
          </Link>
          <Link
            to={`/record/${currentRecord.id}/correct`}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-warning/30 bg-warning/10 text-warning rounded-lg text-sm hover:bg-warning/20 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            修正参数
          </Link>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-light transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载结果
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
            <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="font-semibold text-text-dark">基本信息</h2>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <p className="text-text-gray mb-1">时间参数</p>
                <div className="bg-info-bg rounded-lg p-3 space-y-1.5">
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
                  <div className="flex justify-between">
                    <span className="text-text-gray">记录条数</span>
                    <span className="text-text-dark font-medium">{records.length} 条</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-text-gray mb-1">单位换算检查</p>
                {currentRecord.unitConversionError.hasError ? (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-medium text-warning">存在错误</span>
                    </div>
                    <p className="text-text-dark text-sm mb-2">{currentRecord.unitConversionError.description}</p>
                    <ul className="space-y-1">
                      {currentRecord.unitConversionError.errorDetails.map((d, i) => (
                        <li key={i} className="text-text-gray text-xs flex gap-1.5">
                          <span className="text-warning">•</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-700 text-sm font-medium">单位换算正确，无异常</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-text-gray mb-1">分析结论</p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-text-dark text-sm">{currentRecord.conclusion}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border-light text-xs text-text-gray space-y-1">
                <p>创建时间：{formatDate(currentRecord.createdAt)}</p>
                <p>更新时间：{formatDate(currentRecord.updatedAt)}</p>
              </div>
            </div>
          </div>

          {selectedProcessingRecord && (
            <div className="bg-white rounded-xl shadow-sm border border-primary/30 overflow-hidden">
              <div className="px-5 py-3 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h2 className="font-semibold text-text-dark">当前时刻明细</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-gray text-xs mb-1">时间</p>
                  <p className="text-text-dark font-medium">{formatDate(selectedProcessingRecord.timestamp)}</p>
                </div>
                <div>
                  <p className="text-text-gray text-xs mb-1">管片编号</p>
                  <p className="text-text-dark font-medium">#{selectedProcessingRecord.segmentId}</p>
                </div>
                <div>
                  <p className="text-text-gray text-xs mb-1">错缝位移</p>
                  <p className={`font-medium ${Math.abs(selectedProcessingRecord.displacement) > 2 ? 'text-warning' : 'text-text-dark'}`}>
                    {selectedProcessingRecord.displacement.toFixed(3)} mm
                  </p>
                </div>
                <div>
                  <p className="text-text-gray text-xs mb-1">应力</p>
                  <p className="text-text-dark font-medium">{selectedProcessingRecord.stress.toFixed(2)} MPa</p>
                </div>
                <div className="col-span-2">
                  <p className="text-text-gray text-xs mb-1">温度</p>
                  <p className="text-text-dark font-medium">{selectedProcessingRecord.temperature.toFixed(1)} ℃</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
            <div className="px-5 py-3 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="font-semibold text-text-dark">时间回放</h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-gray">进度</span>
                <span className="font-medium text-primary">{currentIdx + 1} / {records.length}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setPlaying(!playing)}
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-light transition-colors shadow-sm"
                >
                  {playing ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (records.length > 0) selectTimestamp(records[0].timestamp);
                  }}
                  className="w-9 h-9 rounded-full border border-border-light text-text-gray hover:bg-gray-50 flex items-center justify-center transition-colors"
                  title="回到开始"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const idx = records.findIndex(r => r.timestamp === selectedTimestamp);
                    if (idx > 0) selectTimestamp(records[idx - 1].timestamp);
                  }}
                  className="w-9 h-9 rounded-full border border-border-light text-text-gray hover:bg-gray-50 flex items-center justify-center transition-colors"
                  title="上一帧"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const idx = records.findIndex(r => r.timestamp === selectedTimestamp);
                    if (idx >= 0 && idx < records.length - 1) selectTimestamp(records[idx + 1].timestamp);
                  }}
                  className="w-9 h-9 rounded-full border border-border-light text-text-gray hover:bg-gray-50 flex items-center justify-center transition-colors"
                  title="下一帧"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex-1" />
                <div className="flex items-center gap-1 text-xs bg-gray-100 rounded-md p-0.5">
                  {[0.5, 1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded transition-colors ${
                        speed === s ? 'bg-white text-primary font-medium shadow-sm' : 'text-text-gray hover:text-text-dark'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2">
                <input
                  type="range"
                  min={0}
                  max={records.length - 1}
                  value={currentIdx >= 0 ? currentIdx : 0}
                  onChange={e => {
                    const idx = Number(e.target.value);
                    if (records[idx]) selectTimestamp(records[idx].timestamp);
                  }}
                  className="w-full accent-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-text-gray mt-1">
                  <span>{formatTime(records[0]?.timestamp || '')}</span>
                  <span className="font-medium text-primary">
                    {selectedTimestamp ? formatTime(selectedTimestamp) : '-'}
                  </span>
                  <span>{formatTime(records[records.length - 1]?.timestamp || '')}</span>
                </div>
              </div>

              <div className="flex gap-1 overflow-x-auto scrollbar-thin py-2">
                {records.map((r, idx) => {
                  const active = r.timestamp === selectedTimestamp;
                  const isError = Math.abs(r.displacement) > 2;
                  return (
                    <button
                      key={r.timestamp}
                      onClick={() => selectTimestamp(r.timestamp)}
                      className={`flex-shrink-0 w-14 h-14 rounded-md flex flex-col items-center justify-center text-xs transition-all ${
                        active
                          ? 'bg-primary text-white shadow-md scale-105'
                          : isError
                          ? 'bg-warning/15 text-warning hover:bg-warning/25 border border-warning/30'
                          : 'bg-gray-100 text-text-gray hover:bg-gray-200'
                      }`}
                      title={`${formatTime(r.timestamp)} 位移:${r.displacement.toFixed(3)}mm`}
                    >
                      <span className="font-medium">{new Date(r.timestamp).getMinutes()}</span>
                      <span className="text-[10px] opacity-70">{new Date(r.timestamp).getSeconds()}s</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
            <div className="px-5 py-3 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <h2 className="font-semibold text-text-dark">处理记录明细</h2>
                <span className="text-xs text-text-gray">(与时间回放共用数据)</span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-text-gray text-xs">
                    <th className="px-5 py-3 font-medium">时间</th>
                    <th className="px-5 py-3 font-medium">管片ID</th>
                    <th className="px-5 py-3 font-medium">错缝位移 (mm)</th>
                    <th className="px-5 py-3 font-medium">应力 (MPa)</th>
                    <th className="px-5 py-3 font-medium">温度 (℃)</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const active = r.timestamp === selectedTimestamp;
                    const isError = Math.abs(r.displacement) > 2;
                    return (
                      <tr
                        key={r.timestamp}
                        onClick={() => selectTimestamp(r.timestamp)}
                        className={`cursor-pointer border-t border-border-light transition-colors ${
                          active ? 'bg-primary/10' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'
                        }`}
                      >
                        <td className="px-5 py-2.5 text-text-dark">{formatDate(r.timestamp)}</td>
                        <td className="px-5 py-2.5 text-text-dark">#{r.segmentId}</td>
                        <td className={`px-5 py-2.5 font-medium ${isError ? 'text-warning' : 'text-text-dark'}`}>
                          {r.displacement.toFixed(3)}
                          {isError && <span className="ml-1 text-xs">⚠</span>}
                        </td>
                        <td className="px-5 py-2.5 text-text-dark">{r.stress.toFixed(2)}</td>
                        <td className="px-5 py-2.5 text-text-dark">{r.temperature.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
