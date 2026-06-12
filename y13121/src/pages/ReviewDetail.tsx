import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, FileQuestion, Gavel, AlertTriangle } from 'lucide-react';
import type { ValidationRecord } from '@/types';
import { ANOMALY_TYPE_LABELS, SEVERITY_LABELS, SEVERITY_COLORS } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatDateTime } from '@/utils/helpers';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.45, ease: 'easeOut' },
  }),
};

const paramLabels: Record<string, string> = {
  enableDivisionByZeroCheck: '除零检查',
  enableRangeCheck: '范围检查',
  enablePathCheck: '路径检查',
  pathThreshold: '路径阈值',
};

function ParamRow({ label, value }: { label: string; value: unknown }) {
  const display =
    typeof value === 'boolean' ? (value ? '开启' : '关闭') : String(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={`text-sm font-medium ${
          typeof value === 'boolean'
            ? value
              ? 'text-emerald-600'
              : 'text-slate-400'
            : 'text-slate-800'
        }`}
      >
        {display}
      </span>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: ValidationRecord['anomalies'][number] }) {
  const isCritical = anomaly.severity === 'critical';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`rounded-lg border p-4 ${
        isCritical
          ? 'border-red-400 bg-red-50/60 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
            SEVERITY_COLORS[anomaly.severity]
          }`}
        >
          {SEVERITY_LABELS[anomaly.severity]}
        </span>
        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {ANOMALY_TYPE_LABELS[anomaly.type]}
        </span>
      </div>
      <p className="text-sm text-slate-700 mb-2">{anomaly.reason}</p>
      {anomaly.impactScope.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {anomaly.impactScope.map((scope: string) => (
            <span
              key={scope}
              className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
            >
              {scope}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function ReviewDetail() {
  const { recordId } = useParams<{ recordId: string }>();
  const validationRecords = useAppStore((s) => s.validationRecords);
  const confirmRecord = useAppStore((s) => s.confirmRecord);
  const markPendingMaterials = useAppStore((s) => s.markPendingMaterials);
  const manualOverride = useAppStore((s) => s.manualOverride);
  const updateExplanation = useAppStore((s) => s.updateExplanation);

  const record = validationRecords.find((r) => r.id === recordId);

  const [explanationText, setExplanationText] = useState(record?.explanation ?? '');
  const [overrideReason, setOverrideReason] = useState('');

  if (!recordId || !record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
          <p className="mb-4 text-lg text-slate-600">未找到该校验记录</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy-900"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </Link>
        </div>
      </div>
    );
  }

  const params = record.parameters as Record<string, unknown>;
  const displayParams = Object.entries(paramLabels)
    .filter(([key]) => key in params)
    .map(([key, label]) => ({ key, label, value: params[key] }));

  const handleConfirm = () => confirmRecord(record.id);
  const handleMarkPending = () => markPendingMaterials(record.id);
  const handleManualOverride = () => {
    const reason =
      overrideReason.trim() ||
      window.prompt('请输入人工改判理由：')?.trim();
    if (!reason) return;
    manualOverride(record.id, reason);
    setOverrideReason('');
  };
  const handleExplanationBlur = () => {
    if (explanationText !== record.explanation) {
      updateExplanation(record.id, explanationText);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-navy-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回工作台
          </Link>
          <h1 className="text-xl font-bold text-slate-800">
            最短路径边界校验 — 记录详情
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左栏 — 参数版本区 */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="bg-[#1e3a5f] px-5 py-3">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                参数版本区
              </h2>
            </div>
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">算法版本</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                  {record.algorithmVersion}
                </span>
              </div>
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  校验参数
                </p>
                {displayParams.map(({ key, label, value }) => (
                  <ParamRow key={key} label={label} value={value} />
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-500">校验时间</span>
                <span className="text-sm text-slate-700">
                  {formatDateTime(record.validatedAt)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* 中栏 — 异常点区 */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="bg-[#1e3a5f] px-5 py-3">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                异常点区
              </h2>
            </div>
            <div className="p-5">
              {record.anomalies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="mb-3 h-10 w-10 text-emerald-400" />
                  <p className="text-base font-medium text-emerald-600">无异常</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {record.anomalies.map((anomaly: ValidationRecord['anomalies'][number], idx: number) => (
                    <AnomalyCard key={idx} anomaly={anomaly} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* 右栏 — 解释说明区 */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="bg-[#1e3a5f] px-5 py-3">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                解释说明区
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  解释说明
                </label>
                <textarea
                  rows={4}
                  value={explanationText}
                  onChange={(e) => setExplanationText(e.target.value)}
                  onBlur={handleExplanationBlur}
                  placeholder="填写解释说明…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30 resize-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  人工改判理由
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="输入改判理由…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]/30"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleConfirm}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#16304f] active:scale-[0.98]"
                >
                  <CheckCircle className="h-4 w-4" />
                  确认
                </button>
                <button
                  onClick={handleMarkPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100 active:scale-[0.98]"
                >
                  <FileQuestion className="h-4 w-4" />
                  标记待补材料
                </button>
                <button
                  onClick={handleManualOverride}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-400 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100 active:scale-[0.98]"
                >
                  <Gavel className="h-4 w-4" />
                  人工改判
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
