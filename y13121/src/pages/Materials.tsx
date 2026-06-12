import { motion } from 'framer-motion';
import { Download, Upload, FileJson, AlertTriangle, FileCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { mockStudentErrors } from '@/data/mockStudentErrors';
import { exportToJson } from '@/utils/helpers';

const REQUIRED_FIELDS = [
  { field: 'id', desc: '唯一标识符，如 se-001' },
  { field: 'studentId', desc: '学生编号，如 S2024001' },
  { field: 'questionId', desc: '题目编号，如 Q-MATH-001' },
  { field: 'subject', desc: '学科，如 数学/物理/化学' },
  { field: 'score', desc: '得分（数值）' },
  { field: 'totalScore', desc: '满分（数值）' },
  { field: 'errorType', desc: '错误类型，如 conceptual/calculation' },
  { field: 'errorDetail', desc: '错误详情描述' },
  { field: 'rawData', desc: '原始数据对象（JSON Object）' },
  { field: 'createdAt', desc: '创建时间，ISO 8601 格式' },
];

const EXPORT_OPTIONS = [
  {
    key: 'report',
    label: '导出校验报告(JSON)',
    icon: FileCheck,
    desc: '包含全部校验记录及异常检测结果',
    color: 'text-emerald-600 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
    iconBg: 'bg-emerald-100',
  },
  {
    key: 'anomaly',
    label: '导出异常清单(JSON)',
    icon: AlertTriangle,
    desc: '仅含检测到异常的校验记录',
    color: 'text-orange-600 border-orange-200 hover:border-orange-400 hover:bg-orange-50',
    iconBg: 'bg-orange-100',
  },
  {
    key: 'review',
    label: '导出复核意见(JSON)',
    icon: FileJson,
    desc: '已填写复核说明的校验记录',
    color: 'text-violet-600 border-violet-200 hover:border-violet-400 hover:bg-violet-50',
    iconBg: 'bg-violet-100',
  },
];

export default function Materials() {
  const validationRecords = useAppStore((s) => s.validationRecords);
  const importMockData = useAppStore((s) => s.importMockData);

  const anomalyRecords = validationRecords.filter(
    (r) => r.anomalies.length > 0
  );

  const reviewRecords = validationRecords.filter(
    (r) => r.explanation.trim() !== ''
  );

  function handleExport(key: string) {
    switch (key) {
      case 'report':
        exportToJson(validationRecords, '校验报告.json');
        break;
      case 'anomaly':
        exportToJson(anomalyRecords, '异常清单.json');
        break;
      case 'review':
        exportToJson(reviewRecords, '复核意见.json');
        break;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">材料出入口</h1>
          <p className="mt-1 text-sm text-slate-500">导入原始数据，导出校验结果</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-navy-900">材料入口</h2>
                <p className="text-xs text-slate-400">Material Entry</p>
              </div>
            </div>

            <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed">
              <p className="font-medium text-navy-900">数据格式要求</p>
              <p className="mt-1">
                请上传 JSON 数组格式的学生错题数据，每条记录需包含以下字段：
              </p>
            </div>

            <div className="mb-6 space-y-0 rounded-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_2fr] bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                <span>字段名</span>
                <span>说明</span>
              </div>
              {REQUIRED_FIELDS.map((item, i) => (
                <div
                  key={item.field}
                  className={`grid grid-cols-[1fr_2fr] px-4 py-2 text-sm ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  <code className="text-xs font-mono text-navy-900">{item.field}</code>
                  <span className="text-slate-600">{item.desc}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => exportToJson(mockStudentErrors, '示例学生错题数据.json')}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                下载示例数据
              </button>
              <button
                onClick={importMockData}
                className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
              >
                <Upload className="h-4 w-4" />
                导入示例数据
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-white">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-navy-900">异常出口</h2>
                <p className="text-xs text-slate-400">Anomaly Export</p>
              </div>
            </div>

            <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed">
              <p>
                导出校验过程中产生的各类结果数据，支持 JSON 格式下载。
              </p>
              <p className="mt-2 text-xs text-slate-400">
                当前共有 {validationRecords.length} 条校验记录，
                {anomalyRecords.length} 条异常记录，
                {reviewRecords.length} 条复核意见
              </p>
            </div>

            <div className="space-y-3">
              {EXPORT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                let count = 0;
                if (opt.key === 'report') count = validationRecords.length;
                if (opt.key === 'anomaly') count = anomalyRecords.length;
                if (opt.key === 'review') count = reviewRecords.length;

                return (
                  <button
                    key={opt.key}
                    onClick={() => handleExport(opt.key)}
                    disabled={count === 0}
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                      count === 0
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                        : opt.color
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${opt.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-slate-400">{opt.desc}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
