import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Clock,
  MapPin,
  Activity,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProcessStore, useDataStore } from '@/stores';
import { mockReportChineseExplanation } from '@/data/mockData';
import { getRiskColor, getRiskLabel, formatDateTime } from '@/utils/geo';
import { cn } from '@/lib/utils';

function ReportSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-2 bg-slate-800/30">
        <span className="text-cyan-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function ReportPage() {
  const navigate = useNavigate();
  const { getAllAnomalies, getAllDataGaps, records, runProcessing, isProcessing } = useProcessStore();
  const { riskNotices, tidalWindows } = useDataStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (records.length === 0 && !isProcessing) {
      runProcessing();
    }
  }, [records.length, isProcessing, runProcessing]);

  const anomalies = getAllAnomalies();
  const dataGaps = getAllDataGaps();

  const riskStats = {
    critical: anomalies.filter((a) => a.riskLevel === 'critical').length,
    high: anomalies.filter((a) => a.riskLevel === 'high').length,
    medium: anomalies.filter((a) => a.riskLevel === 'medium').length,
    low: anomalies.filter((a) => a.riskLevel === 'low').length,
  };

  const handleCopyExplanation = async () => {
    try {
      await navigator.clipboard.writeText(mockReportChineseExplanation);
      setCopied(true);
      console.log('%c[报告] 普通话解释已复制到剪贴板', 'color:#10b981;');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  const handleExport = () => {
    console.log('%c[报告] 正在导出报告...', 'color:#74c0fc;');
    const reportData = {
      generatedAt: new Date().toISOString(),
      anomalies,
      dataGaps,
      records,
      riskNotices,
      explanation: mockReportChineseExplanation,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `溢油复盘报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-200">
      <div className="max-w-5xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回工作台</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyExplanation}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '已复制' : '复制说明'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              导出报告
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <FileText size={22} className="text-white" />
            </div>
            海面溢油扩散复盘报告
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            大亚湾 6·15 溢油事件 · 生成时间: {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '异常点总数', value: anomalies.length, icon: <AlertTriangle size={20} />, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: '高风险', value: riskStats.high + riskStats.critical, icon: <AlertCircle size={20} />, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: '数据缺口', value: dataGaps.length, icon: <Activity size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: '处理记录', value: records.length, icon: <CheckCircle size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <ReportSection title="普通话说明" icon={<MessageSquareIconWrapper />}>
          <div className="relative">
            <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-5 border border-slate-600/50">
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {mockReportChineseExplanation}
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyExplanation}
              className={cn(
                'absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-all',
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
              )}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? '已复制' : '一键复制'}
            </button>
          </div>
        </ReportSection>

        <div className="grid grid-cols-2 gap-5 mt-5">
          <ReportSection title="风险分层统计" icon={<Activity size={18} />}>
            <div className="space-y-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
                const count = riskStats[level];
                const percent = anomalies.length > 0 ? (count / anomalies.length) * 100 : 0;
                return (
                  <div key={level}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400 flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getRiskColor(level) }}
                        />
                        {getRiskLabel(level)}风险
                      </span>
                      <span className="text-slate-300 font-mono">{count} 个</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: getRiskColor(level),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ReportSection>

          <ReportSection title="潮汐窗口说明" icon={<Clock size={18} />}>
            <div className="space-y-2">
              {tidalWindows.map((tide) => (
                <div
                  key={tide.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    tide.type === 'flood' && 'bg-blue-900/20 border-blue-700/50',
                    tide.type === 'ebb' && 'bg-teal-900/20 border-teal-700/50',
                    tide.type === 'slack' && 'bg-purple-900/20 border-purple-700/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{tide.label}</span>
                    <span className="text-xs text-slate-400">潮高 {tide.height}m</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDateTime(tide.startTime).slice(11)} - {formatDateTime(tide.endTime).slice(11)}
                  </p>
                </div>
              ))}
            </div>
          </ReportSection>
        </div>

        <div className="mt-5">
          <ReportSection title="数据缺口清单" icon={<AlertTriangle size={18} />}>
            {dataGaps.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">暂无数据缺口</p>
            ) : (
              <div className="space-y-3">
                {dataGaps.map((gap) => (
                  <div
                    key={gap.id}
                    className="p-4 rounded-lg bg-amber-900/20 border border-amber-700/50"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-200">{gap.description}</p>
                        <p className="text-xs text-amber-300/70 mt-1">
                          <span className="font-medium">影响：</span>
                          {gap.impact}
                        </p>
                        <p className="text-xs text-amber-300/70 mt-1">
                          <span className="font-medium">建议：</span>
                          {gap.suggestion}
                        </p>
                        <button
                          onClick={() => {
                            console.log(
                              `%c[复核入口] 跳转到数据缺口 ${gap.id} 的复核页面`,
                              'color:#74c0fc;'
                            );
                            navigate('/');
                          }}
                          className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          前往补录 →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>
        </div>

        <div className="mt-5">
          <ReportSection title="异常点与风险通报追溯" icon={<MapPin size={18} />}>
            <div className="space-y-3">
              {anomalies.slice(0, 5).map((anomaly) => {
                const notice = riskNotices.find((n) => n.id === anomaly.relatedNoticeId);
                return (
                  <div
                    key={anomaly.id}
                    className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: getRiskColor(anomaly.riskLevel) }}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-slate-200">{anomaly.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDateTime(anomaly.timestamp)} · {getRiskLabel(anomaly.riskLevel)}风险
                        </p>
                        {notice && (
                          <div className="mt-2 pl-3 border-l-2 border-cyan-500/50">
                            <p className="text-xs text-cyan-400 font-medium">
                              ↳ 关联风险通报: {notice.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              处理意见: {notice.handlingOpinion.slice(0, 50)}...
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ReportSection>
        </div>

        <div className="mt-5">
          <ReportSection title="复核记录摘要" icon={<CheckCircle size={18} />}>
            <p className="text-sm text-slate-400">
              本次复核共涉及
              <span className="text-cyan-300 font-medium mx-1">{records.length}</span>
              条处理记录，涵盖风险通报、浮标数据、船舶轨迹、养殖日志、盐度监测五类数据来源。
              轨迹清洗与风险分层共用同一批处理记录，确保界面展示与报告导出数据一致。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {records.map((r) => (
                <span
                  key={r.id}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs',
                    r.status === 'completed' && 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50',
                    r.status === 'partial' && 'bg-amber-900/30 text-amber-300 border border-amber-700/50',
                    r.status === 'failed' && 'bg-red-900/30 text-red-300 border border-red-700/50'
                  )}
                >
                  {r.sourceType === 'risk_notice' && '风险通报'}
                  {r.sourceType === 'buoy' && '浮标数据'}
                  {r.sourceType === 'ship' && '船舶轨迹'}
                  {r.sourceType === 'aquaculture' && '养殖日志'}
                  {r.sourceType === 'salinity' && '盐度监测'}
                  {' · '}
                  {r.status === 'completed' && '完整'}
                  {r.status === 'partial' && '部分'}
                  {r.status === 'failed' && '失败'}
                </span>
              ))}
            </div>
          </ReportSection>
        </div>

        <div className="mt-8 pb-8 text-center text-xs text-slate-600">
          报告由海面溢油扩散复盘系统自动生成 · 数据来源于共用处理记录池
        </div>
      </div>
    </div>
  );
}

function MessageSquareIconWrapper() {
  return <FileText size={18} />;
}
