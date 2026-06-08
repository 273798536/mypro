import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, RotateCcw, Camera, FileDown, AlertTriangle, CheckCircle, XCircle,
  Clock, Shield, Database, TrendingDown, ChevronRight,
} from 'lucide-react';
import { useDemoStore } from '@/store/demoStore';
import { formatTime, getRiskLabel, getRiskColor } from '@/utils/collision';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { THRESHOLD_CONFIG, TOTAL_DURATION } from '@/data/mockData';
import { exportScreenshotWithWatermark, downloadDataURL, downloadReportHTML } from '@/utils/export';

export default function ReviewPage() {
  const navigate = useNavigate();
  const session = useDemoStore();

  const oobEvents = session.events.filter((e) => e.type === 'out-of-bounds');
  const warnings = session.events.filter((e) => e.type === 'warning');
  const unusable = session.unusableRecords;

  const chartData = useMemo(() => {
    return session.distanceHistory.filter((_, i) => i % 3 === 0).map((h) => ({
      time: parseFloat(h.time.toFixed(2)),
      distance: isNaN(h.distance) ? null : parseFloat(h.distance.toFixed(3)),
    }));
  }, [session.distanceHistory]);

  const jumpToEvent = (t: number) => {
    navigate('/');
    setTimeout(() => {
      useDemoStore.getState().seekTo(t);
      useDemoStore.getState().setStatus('paused');
    }, 50);
  };

  const handleExportScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('未找到3D画布，请返回主演示页后导出');
      return;
    }
    const dataUrl = exportScreenshotWithWatermark(canvas as HTMLCanvasElement, {
      currentTime: session.currentTime,
      plane: session.plane,
    });
    downloadDataURL(dataUrl, `边坡检测帧_${formatTime(session.currentTime).replace(/:/g, '-')}.png`);
  };

  const handleExportReport = () => {
    const fullSession = {
      ...session,
      totalDuration: TOTAL_DURATION,
      distanceHistory: session.distanceHistory,
    };
    downloadReportHTML(fullSession as any);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800">
      <header className="bg-mine-blue text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold">结算 · 复盘总览</h1>
            <p className="text-xs text-blue-200">会话 {session.id} · 开始于 {session.startTime.toLocaleString('zh-CN')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { useDemoStore.getState().restart(); navigate('/'); }}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center gap-1.5 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> 重新演示
          </button>
          <button
            onClick={() => { useDemoStore.getState().setStatus('playing'); navigate('/'); }}
            className="px-4 py-2 rounded-lg bg-mine-rock hover:bg-orange-500 transition flex items-center gap-1.5 text-sm font-semibold"
          >
            <Play className="w-4 h-4" /> 继续播放
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <Clock className="w-4 h-4" /> 总时长
            </div>
            <div className="font-mono text-3xl font-bold text-mine-blue">{formatTime(session.totalDuration)}</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <Shield className="w-4 h-4" /> 剖切面越界
            </div>
            <div className="font-mono text-3xl font-bold text-red-500">{oobEvents.length}</div>
            <div className="text-xs text-slate-500 mt-1">次自动拦截</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-amber-500">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <AlertTriangle className="w-4 h-4" /> 预警
            </div>
            <div className="font-mono text-3xl font-bold text-amber-500">{warnings.length}</div>
            <div className="text-xs text-slate-500 mt-1">次接近阈值</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
              <Database className="w-4 h-4" /> 不可用记录
            </div>
            <div className="font-mono text-3xl font-bold text-purple-500">{unusable.length}</div>
            <div className="text-xs text-slate-500 mt-1">条（评审排除）</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-mine-rock" />
              最小距离趋势（全程）
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500" /> 安全 {'≥'}{THRESHOLD_CONFIG.safeDistance}m</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" /> 预警</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500" /> 越界 {'<'}{THRESHOLD_CONFIG.dangerDistance}m</span>
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: '时间 (s)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  label={{ value: '距离 (m)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                  domain={[0, 2.5]}
                />
                <Tooltip
                  labelFormatter={(v) => `时间 ${v}s`}
                  formatter={(v: any) => [v !== null ? v + 'm' : '数据缺失', '最小距离']}
                />
                <ReferenceLine y={THRESHOLD_CONFIG.safeDistance} stroke="#22c55e" strokeDasharray="4 4" label={{ value: '安全线', position: 'right', fontSize: 10, fill: '#22c55e' }} />
                <ReferenceLine y={THRESHOLD_CONFIG.dangerDistance} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '越界线', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <Line
                  type="monotone"
                  dataKey="distance"
                  stroke="#E87722"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-mine-rock" />
              关键事件时间线
              <span className="text-xs text-slate-500 font-normal ml-2">（点击跳转到对应帧）</span>
            </h2>
            <div className="relative pl-6 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200" />
              {session.events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => jumpToEvent(e.timestamp)}
                  className="relative w-full text-left group"
                >
                  <div
                    className="absolute -left-[22px] top-2 w-4 h-4 rounded-full border-2 border-white shadow"
                    style={{
                      backgroundColor:
                        e.type === 'out-of-bounds' ? '#D7263D' :
                        e.type === 'data-missing' ? '#8B5CF6' :
                        '#F59E0B',
                    }}
                  />
                  <div className={`p-3 rounded-lg border transition group-hover:shadow-md ${
                    e.isRecordUsable ? 'bg-slate-50 border-slate-200 group-hover:border-mine-rock/40'
                    : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">t={e.timestamp.toFixed(2)}s</span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                          style={{ backgroundColor: getRiskColor(e.riskLevel) }}
                        >
                          {getRiskLabel(e.riskLevel)}
                        </span>
                        {!e.isRecordUsable && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white">
                            不可用
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-mine-rock transition" />
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{e.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
              <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                评审关注：剖切面越界拦截
              </h3>
              {oobEvents.length === 0 ? (
                <p className="text-sm text-slate-500">无越界事件</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin">
                  {oobEvents.map((e, i) => (
                    <div key={e.id} className="bg-red-50 rounded-lg p-2.5 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-red-700">越界 #{i + 1} · t={e.timestamp.toFixed(2)}s</span>
                        <CheckCircle className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <p className="text-slate-700">{e.description}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        最小距离 {e.minDistance.toFixed(3)}m {'<'} 阈值 {e.threshold}m，连续3帧触发
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-5">
              <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2 text-purple-700">
                <XCircle className="w-4 h-4" />
                评审关注：不可用记录（需排除）
              </h3>
              {unusable.length === 0 ? (
                <p className="text-sm text-slate-500">所有记录均可用</p>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin">
                  {unusable.map((e) => (
                    <div key={e.id} className="bg-purple-50 rounded-lg p-2.5 text-xs border-l-2 border-purple-400">
                      <span className="font-mono text-purple-700">t={e.timestamp.toFixed(2)}s</span>
                      <p className="text-slate-700 mt-0.5">{e.unusableReason || e.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
              <h3 className="font-display text-base font-semibold flex items-center gap-2">
                <FileDown className="w-4 h-4 text-mine-rock" />
                导出评审资料
              </h3>
              <button
                onClick={handleExportScreenshot}
                className="w-full py-2.5 px-4 rounded-lg bg-mine-blue hover:bg-blue-900 text-white text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                导出当前帧截图（带时间/距离水印）
              </button>
              <button
                onClick={handleExportReport}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-mine-rock to-orange-500 hover:from-orange-500 hover:to-mine-rock text-white text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                导出完整检测报告（HTML）
              </button>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                报告包含：越界判定逻辑说明、所有越界事件明细、不可用记录列表、完整事件时间表，可直接作为评审会附件。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
