import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Play,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  FileQuestion,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  ANOMALY_TYPE_LABELS,
} from '@/types';
import type { ValidationRecord, ValidationStatus, Anomaly } from '@/types';
import { calculateScoreRate } from '@/utils/helpers';

function StatusBadge({ status }: { status: ValidationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function AnomalyBadges({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return <span className="text-xs text-slate-400">无异常</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {anomalies.map((a, i) => (
        <span
          key={i}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${SEVERITY_COLORS[a.severity]}`}
          title={`${ANOMALY_TYPE_LABELS[a.type]}: ${a.reason}`}
        >
          {ANOMALY_TYPE_LABELS[a.type]}
        </span>
      ))}
    </div>
  );
}

function ActionButtons({ record }: { record: ValidationRecord }) {
  const { confirmRecord, revokeRecord, markPendingMaterials } = useAppStore();

  if (record.status === 'pending') {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => confirmRecord(record.id)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <CheckCircle2 size={12} />
          确认
        </button>
        <button
          onClick={() => markPendingMaterials(record.id)}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <FileQuestion size={12} />
          标记待补
        </button>
      </div>
    );
  }

  if (record.status === 'confirmed') {
    return (
      <button
        onClick={() => revokeRecord(record.id)}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        <RotateCcw size={12} />
        撤回
      </button>
    );
  }

  if (record.status === 'pending_materials') {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => confirmRecord(record.id)}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <CheckCircle2 size={12} />
          确认
        </button>
        <button
          onClick={() => revokeRecord(record.id)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RotateCcw size={12} />
          撤回
        </button>
      </div>
    );
  }

  if (record.status === 'manual_override') {
    return (
      <button
        onClick={() => revokeRecord(record.id)}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        <RotateCcw size={12} />
        撤回
      </button>
    );
  }

  if (record.status === 'revoked') {
    return (
      <button
        onClick={() => markPendingMaterials(record.id)}
        className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
      >
        <FileQuestion size={12} />
        标记待补
      </button>
    );
  }

  return null;
}

function AnomalyPauseModal() {
  const { pausedRecordId, validationRecords, confirmRecord, markPendingMaterials, setPausedRecordId } =
    useAppStore();

  const pausedRecord = pausedRecordId
    ? validationRecords.find((r) => r.id === pausedRecordId)
    : null;

  if (!pausedRecordId || !pausedRecord) return null;

  const criticalAnomalies = pausedRecord.anomalies.filter((a) => a.severity === 'critical');
  const allImpactScopes = [...new Set(criticalAnomalies.flatMap((a) => a.impactScope))];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 backdrop-blur-sm"
        onClick={() => setPausedRecordId(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mx-4 w-full max-w-lg rounded-xl border border-amber-300 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-900">校验暂停 — 发现严重异常</h3>
              <p className="text-sm text-amber-700">
                学号 {pausedRecord.studentError.studentId} / 题号 {pausedRecord.studentError.questionId}
              </p>
            </div>
            <button
              onClick={() => setPausedRecordId(null)}
              className="ml-auto rounded-md p-1 text-slate-400 transition-colors hover:bg-amber-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                暂停原因
              </h4>
              <div className="space-y-2">
                {criticalAnomalies.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${SEVERITY_COLORS[a.severity]}`}
                      >
                        {SEVERITY_LABELS[a.severity]}
                      </span>
                      <span className="text-sm font-medium text-red-800">
                        {ANOMALY_TYPE_LABELS[a.type]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-red-700">{a.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                影响范围
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {allImpactScopes.map((scope, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">
                算法版本: <span className="font-mono font-medium text-slate-700">{pausedRecord.algorithmVersion}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button
              onClick={() => markPendingMaterials(pausedRecord.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              <FileQuestion size={16} />
              标记待补材料
            </button>
            <button
              onClick={() => confirmRecord(pausedRecord.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-900"
            >
              <CheckCircle2 size={16} />
              确认
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Workbench() {
  const {
    studentErrors,
    validationRecords,
    isValidating,
    pausedRecordId,
    importMockData,
    startValidation,
  } = useAppStore();

  const handleStartValidation = useCallback(() => {
    if (isValidating || studentErrors.length === 0) return;
    startValidation();
  }, [isValidating, studentErrors.length, startValidation]);

  const hasPausedAlert = pausedRecordId !== null && validationRecords.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            最短路径边界校验
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            导入学生错题数据，执行边界校验，识别除零、范围越界等异常
          </p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 transition-colors hover:border-navy-400">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-50">
                  <Upload className="h-6 w-6 text-navy-600" />
                </div>
                <div>
                  <p className="font-medium text-navy-900">导入区域</p>
                  <p className="text-sm text-slate-500">
                    {studentErrors.length > 0
                      ? `已导入 ${studentErrors.length} 条学生错题记录`
                      : '拖拽文件至此处或点击导入示例数据'}
                  </p>
                </div>
              </div>
              <button
                onClick={importMockData}
                className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:border-navy-300"
              >
                <Upload size={16} />
                导入示例数据
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-6 flex items-center gap-4"
        >
          <button
            onClick={handleStartValidation}
            disabled={isValidating || studentErrors.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                校验中...
              </>
            ) : (
              <>
                <Play size={16} />
                开始校验
              </>
            )}
          </button>
          {validationRecords.length > 0 && (
            <span className="text-sm text-slate-500">
              已校验 {validationRecords.length} 条记录
            </span>
          )}
        </motion.div>

        <AnimatePresence>
          {hasPausedAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">
                    校验已暂停：发现严重异常（除零边界），请处理后再继续
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {validationRecords.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
              <p className="text-sm text-slate-400">
                暂无校验记录，请先导入数据并执行校验
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">学号</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">题号</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">科目</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">得分/总分</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">得分率</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">状态</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">异常</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationRecords.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                          index % 2 === 1 ? 'bg-slate-50/50' : ''
                        } ${pausedRecordId === record.id ? 'bg-amber-50/60' : ''}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-navy-800">
                          {record.studentError.studentId}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-navy-800">
                          {record.studentError.questionId}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {record.studentError.subject}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                          <span className="text-slate-800">{record.studentError.score}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-600">{record.studentError.totalScore}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                          {calculateScoreRate(record.studentError.score, record.studentError.totalScore)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="px-4 py-3">
                          <AnomalyBadges anomalies={record.anomalies} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <ActionButtons record={record} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <AnomalyPauseModal />
    </div>
  );
}
