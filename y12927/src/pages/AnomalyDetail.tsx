import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  Code2,
  History,
  MessageSquareWarning,
  Eye,
  Wrench,
  Copy,
  Check,
  BarChart3,
  Table2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import {
  AnomalyTypeTag,
  SeverityTag,
  StatusTag,
  LogStatusBadge,
} from '@/components/Tags';
import { formatDateTime } from '@/utils/format';
import type {
  Anomaly,
  ModelLog,
  Example,
  Correction,
} from '../../shared/types';
import { ANOMALY_TYPE_LABEL, ANOMALY_TYPE_COLOR } from '../../shared/types';

export default function AnomalyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<{
    anomaly: Anomaly;
    logs: ModelLog[];
    examples: Example[];
    correction?: Correction;
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getAnomalyDetail(id).then(setDetail).catch(() => navigate('/overview'));
  }, [id, navigate]);

  if (!detail) {
    return (
      <div className="p-16 text-center text-gray-500">
        <div className="animate-pulse">加载中...</div>
      </div>
    );
  }

  const { anomaly, logs, examples, correction } = detail;

  const copyRaw = () => {
    navigator.clipboard.writeText(anomaly.rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const barData = [
    {
      name: '相似度',
      当前值: Math.round((anomaly.metrics.similarity ?? 0) * 100),
      阈值: 95,
      正常均值: 72,
    },
    {
      name: '规则覆盖度',
      当前值: Math.round((anomaly.metrics.coverage ?? 0) * 100),
      阈值: 80,
      正常均值: 92,
    },
    {
      name: '偏离度',
      当前值: Math.round((anomaly.metrics.deviation ?? 0) * 100),
      阈值: 30,
      正常均值: 12,
    },
  ].filter((d) => d.当前值 !== 0 || d.正常均值 !== 0);

  const radarData = [
    { subject: '完整性', A: anomaly.metrics.coverage !== undefined ? 100 - anomaly.metrics.coverage * 100 : 75, fullMark: 100 },
    { subject: '一致性', A: anomaly.metrics.similarity !== undefined ? anomaly.metrics.similarity * 100 : 60, fullMark: 100 },
    { subject: '格式规范', A: anomaly.metrics.deviation !== undefined ? 100 - anomaly.metrics.deviation * 100 : 85, fullMark: 100 },
    { subject: '隔离性', A: anomaly.type === 'leak' ? 20 : 90, fullMark: 100 },
    { subject: '规则匹配', A: anomaly.type === 'rule_missing' ? 30 : 88, fullMark: 100 },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost mb-5 -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        返回概览
      </button>

      <header className="mb-6">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="p-3 rounded-xl bg-red-50">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-serif">异常详情</h1>
              <AnomalyTypeTag type={anomaly.type} />
              <SeverityTag severity={anomaly.severity} />
              <StatusTag status={anomaly.status} />
              <span className="font-mono text-xs text-gray-400">{anomaly.id}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              所属批次：{anomaly.batchId} · 类型：{ANOMALY_TYPE_LABEL[anomaly.type]}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/correction?anomaly=${anomaly.id}`} className="btn-primary">
              <Wrench className="w-4 h-4" />
              去修正
            </Link>
          </div>
        </div>
      </header>

      <section className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareWarning className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-serif">为什么这条样本没通过？</h2>
          <span className="text-xs text-gray-400 ml-2">用人话讲，不用看代码</span>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-5 mb-4">
          <p className="text-gray-800 leading-relaxed text-[15px]">
            {anomaly.humanReason}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              样本原文
            </h3>
            <div className="bg-sand-100 rounded-lg p-4 font-mono text-sm leading-relaxed text-gray-700 whitespace-pre-wrap break-all">
              {anomaly.originalText}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <Code2 className="w-4 h-4" />
              机器原始码（给工程师看）
              <button
                onClick={copyRaw}
                className="ml-auto btn-ghost !py-1 !px-2 text-xs"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制'}
              </button>
            </h3>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs leading-relaxed text-amber-200">
              {anomaly.rawCode}
            </div>
            {correction && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-xs text-green-700 font-medium">已有处理意见</p>
                <p className="text-sm text-gray-700 mt-1">动作：{correction.action}</p>
                <p className="text-sm text-gray-600 mt-1">{correction.opinion}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {correction.operator} · {formatDateTime(correction.correctedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <section className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              <h2 className="text-lg font-serif">图表证据</h2>
              <span className="text-xs text-gray-400">数值和问题对得上</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f3ed" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="当前值" fill={ANOMALY_TYPE_COLOR[anomaly.type]} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="当前值" position="top" fontSize={11} />
                </Bar>
                <Bar dataKey="阈值" fill="#b7d0ea" radius={[6, 6, 0, 0]} />
                <Bar dataKey="正常均值" fill="#d1fae5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-serif">质量维度雷达</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e9e6da" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="当前样本"
                  dataKey="A"
                  stroke={ANOMALY_TYPE_COLOR[anomaly.type]}
                  fill={ANOMALY_TYPE_COLOR[anomaly.type]}
                  fillOpacity={0.3}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Table2 className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-serif">可复现的日常样例</h2>
          <span className="text-xs text-gray-400">贴近真实场景：旧表 / 补录备注 / 漏填单位</span>
        </div>

        {examples.length > 0 && (
          <>
            <div className="flex gap-2 mb-4 border-b border-sand-200">
              {examples.map((ex, idx) => (
                <button
                  key={ex.id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === idx
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {ex.scenario}
                </button>
              ))}
            </div>
            {examples[activeTab] && (
              <div>
                <h3 className="font-medium text-gray-800">{examples[activeTab].title}</h3>
                <p className="text-sm text-gray-500 mt-1">{examples[activeTab].description}</p>
                <div className="mt-4 rounded-lg border border-sand-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(examples[activeTab].data).map(([k, v]) => (
                        <tr key={k} className="border-b border-sand-100 last:border-0">
                          <td className="py-2.5 px-4 bg-sand-50 w-40 font-medium text-gray-600 align-top">
                            {k}
                          </td>
                          <td className="py-2.5 px-4 text-gray-800 whitespace-pre-wrap break-all">
                            {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <History className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-serif">模型日志追溯</h2>
          <span className="text-xs text-gray-400">顺着判定链路往回查</span>
        </div>
        <div className="space-y-0">
          {logs.map((log) => (
            <div key={log.id} className="timeline-line pl-7 pb-6">
              <div className="relative">
                <span
                  className={`badge-dot absolute -left-[27px] top-1 ring-4 ring-white w-5 h-5 flex items-center justify-center`}
                  style={{
                    backgroundColor:
                      log.status === 'fail'
                        ? '#ef4444'
                        : log.status === 'warn'
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  <span className="w-2 h-2 bg-white rounded-full" />
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium text-gray-800">
                    步骤 {log.stepIndex} · {log.stepName}
                  </span>
                  <LogStatusBadge status={log.status} />
                  <span className="text-xs text-gray-400">{formatDateTime(log.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-mono text-xs bg-sand-100 px-2 py-0.5 rounded">
                    {log.value}
                  </span>
                </p>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  {log.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
