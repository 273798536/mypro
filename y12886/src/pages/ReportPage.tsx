import { useMemo, useEffect } from 'react';
import type { ReviewTask } from '@/types';
import { useReviewStore } from '@/store/reviewStore';
import { computeWindRose, computeSeaStateSummary, validateWaterTemp } from '@/utils/dataEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { AlertTriangle, FileDown, CheckCircle, ShieldCheck, ShieldAlert, ShieldX, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusLabel: Record<ReviewTask['status'], string> = { running: '运行中', completed: '已完成', confirmed: '已确认' };
const statusColor: Record<ReviewTask['status'], string> = { running: 'bg-yellow-100 text-yellow-800', completed: 'bg-blue-100 text-blue-800', confirmed: 'bg-green-100 text-green-800' };
const conclusionConfig = {
  safe: { label: '安全', icon: ShieldCheck, cls: 'bg-green-100 text-green-800 border-green-300' },
  caution: { label: '注意', icon: ShieldAlert, cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  danger: { label: '危险', icon: ShieldX, cls: 'bg-red-100 text-red-800 border-red-300' },
};

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold border-l-4 border-blue-500 pl-3 mb-3">{children}</h2>;
}

export default function ReportPage() {
  const { currentTask, exportReport, createTask } = useReviewStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentTask) {
      createTask();
    }
  }, [currentTask, createTask]);

  const windData = useMemo(() => {
    if (!currentTask) return [];
    return currentTask.weatherRecords
      .filter(r => !r.isAnomaly)
      .map(r => ({ time: fmtTime(r.timestamp), 风速: r.windSpeed }));
  }, [currentTask]);

  const seaStateSummary = useMemo(() => {
    if (!currentTask) return [];
    return computeSeaStateSummary(currentTask.weatherRecords);
  }, [currentTask]);

  const buoyChartData = useMemo(() => {
    if (!currentTask) return [];
    return currentTask.buoyRecords.map(r => ({
      time: fmtTime(r.timestamp),
      盐度: r.isAnomaly ? undefined : r.salinityNormalized,
      水温: r.isAnomaly ? undefined : r.waterTemp,
    }));
  }, [currentTask]);

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>暂无复核任务，请先创建任务</p>
      </div>
    );
  }

  const t = currentTask;
  const anomalyWeather = t.weatherRecords.filter(r => r.isAnomaly);
  const windAvg = t.weatherRecords.filter(r => !r.isAnomaly).reduce((s, r) => s + r.windSpeed, 0) / (t.weatherRecords.filter(r => !r.isAnomaly).length || 1);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <header className="px-6 py-4 text-white flex items-center gap-3" style={{ backgroundColor: '#0C2D48' }}>
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          title="返回总览"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold">报告预览</h1>
      </header>

    <div className="max-w-[900px] mx-auto my-6 bg-white shadow-md rounded-lg p-8 print:shadow-none print:my-0">
      <h1 className="text-2xl font-bold text-center mb-6">海底管线路由复核报告</h1>

      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600 mb-6 pb-4 border-b">
        <span>任务编号：<b>{t.id}</b></span>
        <span>操作人：{t.operator}</span>
        <span>创建时间：{fmtTime(t.createdAt)}</span>
        <span>运行次数：{t.runCount}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[t.status]}`}>{statusLabel[t.status]}</span>
      </div>

      <section className="mb-8">
        <SectionTitle>一、气象概况</SectionTitle>
        <div className="h-52 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={windData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis unit="m/s" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="风速" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="w-full text-sm mb-4 border-collapse">
          <thead><tr className="bg-gray-50"><th className="border px-3 py-1.5">海况等级</th><th className="border px-3 py-1.5">描述</th><th className="border px-3 py-1.5">次数</th></tr></thead>
          <tbody>
            {seaStateSummary.map(s => <tr key={s.level}><td className="border px-3 py-1.5 text-center">{s.level}</td><td className="border px-3 py-1.5">{s.label}</td><td className="border px-3 py-1.5 text-center">{s.count}</td></tr>)}
          </tbody>
        </table>
        <p className="text-sm text-gray-700 leading-relaxed mb-2">
          监测期间平均风速 {windAvg.toFixed(1)} m/s，海况以轻浪为主，气象条件总体{windAvg > 10 ? '较差' : '良好'}。
        </p>
        {anomalyWeather.length > 0 && (
          <div className="space-y-1">
            {anomalyWeather.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{r.anomalyReason}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <SectionTitle>二、浮标数据</SectionTitle>
        <div className="h-52 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={buoyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="盐度" stroke="#3b82f6" connectNulls />
              <Line type="monotone" dataKey="水温" stroke="#ef4444" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-50">
            <th className="border px-3 py-1.5">时间</th><th className="border px-3 py-1.5">浮标</th>
            <th className="border px-3 py-1.5">盐度(‰)</th><th className="border px-3 py-1.5">水温</th>
            <th className="border px-3 py-1.5">潮位</th><th className="border px-3 py-1.5">状态</th>
          </tr></thead>
          <tbody>
            {t.buoyRecords.map(r => (
              <tr key={r.id} className={r.isAnomaly ? 'bg-red-50 border-dashed border border-red-300' : ''}>
                <td className="border px-3 py-1.5">{fmtTime(r.timestamp)}</td>
                <td className="border px-3 py-1.5 text-center">{r.buoyId}</td>
                <td className="border px-3 py-1.5 text-center">{r.salinityNormalized.toFixed(2)}</td>
                <td className="border px-3 py-1.5 text-center">
                  {r.isAnomaly && r.anomalyReason?.includes('水温') ? (() => {
                    const { corrected } = validateWaterTemp(r.waterTempRaw);
                    return (
                      <span><s className="text-red-400">{r.waterTempRaw}</s> → <span className="font-medium text-green-700">{corrected?.toFixed(1) ?? r.waterTemp.toFixed(1)}°C</span></span>
                    );
                  })() : (
                    r.waterTemp.toFixed(1) + '°C'
                  )}
                </td>
                <td className="border px-3 py-1.5 text-center">{r.tideLevel != null ? r.tideLevel.toFixed(1) : '—'}</td>
                <td className="border px-3 py-1.5 text-center">
                  {r.isAnomaly ? <span className="text-red-600 text-xs">异常</span> : <span className="text-green-600 text-xs">正常</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <SectionTitle>三、水质预警</SectionTitle>
        {t.alerts.length === 0 && <p className="text-sm text-gray-500">无预警</p>}
        <div className="space-y-3">
          {t.alerts.map(a => (
            <div key={a.id} className={`p-4 rounded border text-sm ${a.changedByExport ? 'border-l-4 border-l-orange-400 bg-orange-50/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1 font-medium">
                <span>{a.indicator}</span>
                <span className="text-xs text-gray-400">阈值 {a.threshold}{a.thresholdUnit}</span>
              </div>
              <div className="text-gray-600 mb-1">{a.reason}</div>
              <div className="flex items-center gap-3 text-sm">
                <span>修正前：<b>{a.beforeValue}{a.thresholdUnit}</b></span>
                {a.changedByExport && <span className="text-orange-500">→</span>}
                <span>修正后：<b className={a.changedByExport ? 'text-green-700' : ''}>{a.afterValue}{a.thresholdUnit}</b></span>
              </div>
              {a.changedByExport && (
                <div className="mt-1 text-xs text-orange-600">
                  导出后判断变化：<s>{a.beforeJudgment === 'normal' ? '正常' : a.beforeJudgment === 'warning' ? '预警' : '严重'}</s>
                  {' → '}<b className="text-green-700">{a.afterJudgment === 'normal' ? '正常' : a.afterJudgment === 'warning' ? '预警' : '严重'}</b>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <SectionTitle>四、处理意见</SectionTitle>
        {t.opinion && (() => {
          const cfg = conclusionConfig[t.opinion.conclusion];
          const Icon = cfg.icon;
          return (
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border text-sm font-medium ${cfg.cls}`}>
                <Icon className="w-4 h-4" />{cfg.label}
              </span>
              <p className="mt-3 text-sm text-gray-700">{t.opinion.reason}</p>
              <div className="mt-2 text-sm text-gray-500">
                {t.opinion.confirmed ? (
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" />已确认</span>
                ) : t.opinion.rejected ? (
                  <span className="text-red-500">已驳回：{t.opinion.rejectReason}</span>
                ) : '待确认'}
              </div>
            </div>
          );
        })()}
      </section>

      {t.supplementLog.length > 0 && (
        <section className="mb-8">
          <SectionTitle>五、补录记录</SectionTitle>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">
              <th className="border px-3 py-1.5">时间</th><th className="border px-3 py-1.5">字段</th>
              <th className="border px-3 py-1.5">原值</th><th className="border px-3 py-1.5">补录值</th>
              <th className="border px-3 py-1.5">操作人</th>
            </tr></thead>
            <tbody>
              {t.supplementLog.map(s => (
                <tr key={s.id}>
                  <td className="border px-3 py-1.5">{fmtTime(s.timestamp)}</td>
                  <td className="border px-3 py-1.5">{s.field}</td>
                  <td className="border px-3 py-1.5"><s className="text-gray-400">{s.oldValue}</s></td>
                  <td className="border px-3 py-1.5 font-medium text-green-700">{s.newValue}</td>
                  <td className="border px-3 py-1.5">{s.operator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="text-center pt-4 border-t">
        <button
          onClick={() => exportReport(t.id)}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition print:hidden"
        >
          <FileDown className="w-4 h-4" />导出报告
        </button>
      </div>
    </div>
    </div>
  );
}
