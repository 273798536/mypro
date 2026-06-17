import { useEffect, useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Download,
  Info,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import { AnomalyTypeTag, SeverityTag, StatusTag } from '@/components/Tags';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';

type ReportFormat = 'excel' | 'html';

interface ReportMeta {
  fileNameBase: string;
  totalAnomalies: number;
  resolvedCount: number;
  pendingCount: number;
  generatedAt: string;
  batchId: string;
}

export default function ExportPage() {
  const { currentBatchId, batches, anomalies, corrections, setAnomalies, setCorrections, setBatches } = useStore();
  const [format, setFormat] = useState<ReportFormat>('excel');
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.getBatches().then(setBatches);
    api.getAnomalies({ batchId: currentBatchId }).then(setAnomalies);
    api.getCorrections().then(setCorrections);
  }, [currentBatchId, setAnomalies, setCorrections, setBatches]);

  useEffect(() => {
    api.getReportMeta(currentBatchId).then(setMeta);
  }, [currentBatchId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const currentBatch = batches.find((b) => b.id === currentBatchId);

  const fileName = meta
    ? `${meta.fileNameBase}.${format === 'excel' ? 'xlsx' : 'html'}`
    : '';

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onExport = async () => {
    setGenerating(true);
    try {
      const expectedName = fileName || `训练切分隔离检查_${format === 'excel' ? 'report.xlsx' : 'report.html'}`;
      const blob = format === 'excel'
        ? await api.downloadExcel(currentBatchId, '训练组-当前用户')
        : await api.downloadHtml(currentBatchId, '训练组-当前用户');
      downloadBlob(blob, expectedName);
      setToast({ type: 'success', text: `已生成报告并触发下载：${expectedName}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出报告失败';
      setToast({ type: 'error', text: msg });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileDown className="w-6 h-6 text-brand-500" />
          报告导出
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          文件名带时间戳和批次号，一眼区分本次运行和上次运行；文件内容给不懂代码的人也能看懂
        </p>
      </header>

      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 card px-5 py-3 shadow-lg flex items-center gap-2 text-sm',
            toast.type === 'success' ? 'border-l-4 border-emerald-500' : 'border-l-4 border-rose-500',
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          )}
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-serif mb-4">选择导出格式</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  key: 'excel' as const,
                  icon: FileSpreadsheet,
                  name: 'Excel（.xlsx）',
                  desc: '给安全审核员看，可直接筛选、打印、转发',
                },
                {
                  key: 'html' as const,
                  icon: FileText,
                  name: 'HTML（可交互）',
                  desc: '浏览器直接打开，异常类型带颜色标记',
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = format === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFormat(opt.key)}
                    className={cn(
                      'p-5 rounded-xl border-2 text-left transition-all',
                      active
                        ? 'border-brand-500 bg-brand-50 shadow-soft'
                        : 'border-sand-200 bg-white hover:border-brand-300',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2.5 rounded-lg',
                          active ? 'bg-brand-500 text-white' : 'bg-sand-100 text-brand-600',
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{opt.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    {active && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        已选择
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-500" />
              文件名预览
            </h2>
            <div className="bg-sand-100 rounded-lg p-4 font-mono text-sm break-all text-gray-700">
              {fileName || '加载中...'}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              命名规则：训练切分隔离检查_YYYYMMDD_HHMMSS_批次号.{format === 'excel' ? 'xlsx' : 'html'}
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-brand-500" />
              报告包含内容预览（与界面一致）
            </h2>
            <div className="space-y-3">
              {anomalies.slice(0, 3).map((a) => {
                const corr = corrections.find((c) => c.anomalyId === a.id);
                return (
                  <div key={a.id} className="p-3 rounded-lg border border-sand-200">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-gray-400">{a.id}</span>
                      <AnomalyTypeTag type={a.type} />
                      <SeverityTag severity={a.severity} />
                      <StatusTag status={a.status} />
                    </div>
                    <p className="text-sm text-gray-700">{a.humanReason}</p>
                    {corr && (
                      <p className="text-xs text-green-700 mt-1.5">
                        ✓ {corr.action} · {corr.opinion}
                      </p>
                    )}
                  </div>
                );
              })}
              {anomalies.length > 3 && (
                <p className="text-xs text-gray-400 text-center">
                  ...还有 {anomalies.length - 3} 条，导出时全部包含
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-serif mb-4">本次概览</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">所属批次</p>
                <p className="font-mono text-sm text-brand-600 mt-0.5">{currentBatchId}</p>
                {currentBatch && (
                  <p className="text-xs text-gray-500 mt-1">{currentBatch.summary}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs text-red-500">异常总数</p>
                  <p className="text-2xl font-serif font-semibold text-red-600 mt-1">
                    {meta?.totalAnomalies ?? '-'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-green-600">已处理</p>
                  <p className="text-2xl font-serif font-semibold text-green-700 mt-1">
                    {meta?.resolvedCount ?? '-'}
                  </p>
                </div>
                <div className="col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-xs text-amber-700">待处理</p>
                    <p className="text-lg font-serif font-semibold text-amber-800">
                      {meta?.pendingCount ?? '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onExport}
              disabled={generating}
              className="btn-primary w-full justify-center mt-6 !py-2.5"
            >
              <Download className="w-4 h-4" />
              {generating ? '正在生成...' : `下载${format === 'excel' ? 'Excel' : 'HTML'}报告`}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              生成时间 {formatDate(new Date().toISOString())}
            </p>
          </section>

          <section className="card p-6 bg-amber-50/40 border-amber-200">
            <h3 className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
              <Info className="w-4 h-4" />
              给非技术同学的说明
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-amber-900/80 leading-relaxed">
              <li>• 文件里"原因说明"那一列是翻译过的人话，不用看"原始机器码"列</li>
              <li>• 异常类型用颜色区分：<span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[11px]">重复</span> <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[11px]">规则漏配</span> <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[11px]">格式错误</span> <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[11px]">训练泄漏</span></li>
              <li>• 修正动作和处理意见和训练组在系统里填的完全一致</li>
              <li>• 想追溯具体某条，拿"异常ID"回系统里搜就能看到完整模型日志</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
