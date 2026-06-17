import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Download,
  Info,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import { AnomalyTypeTag, SeverityTag, StatusTag } from '@/components/Tags';
import {
  ANOMALY_TYPE_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
} from '../../shared/types';
import { formatDate, formatDateTime } from '@/utils/format';
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

  useEffect(() => {
    api.getBatches().then(setBatches);
    api.getAnomalies({ batchId: currentBatchId }).then(setAnomalies);
    api.getCorrections().then(setCorrections);
  }, [currentBatchId, setAnomalies, setCorrections, setBatches]);

  useEffect(() => {
    api.getReportMeta(currentBatchId).then(setMeta);
  }, [currentBatchId]);

  const currentBatch = batches.find((b) => b.id === currentBatchId);

  const fileName = meta
    ? `${meta.fileNameBase}.${format === 'excel' ? 'xlsx' : 'html'}`
    : '';

  const buildExportRows = () => {
    return anomalies.map((a) => {
      const corr = corrections.find((c) => c.anomalyId === a.id);
      return {
        异常ID: a.id,
        批次: a.batchId,
        异常类型: ANOMALY_TYPE_LABEL[a.type],
        严重程度: SEVERITY_LABEL[a.severity],
        处理状态: STATUS_LABEL[a.status],
        '原因说明(人话)': a.humanReason,
        样本原文: a.originalText,
        原始机器码: a.rawCode,
        修正动作: corr?.action || '',
        处理意见: corr?.opinion || '',
        操作人: corr?.operator || '',
        修正时间: corr?.correctedAt ? formatDateTime(corr.correctedAt) : '',
      };
    });
  };

  const exportExcel = () => {
    setGenerating(true);
    setTimeout(() => {
      const rows = buildExportRows();
      const summary = [
        { A: '训练切分隔离检查报告', B: '' },
        { A: '生成时间', B: formatDateTime(new Date().toISOString()) },
        { A: '批次号', B: currentBatchId },
        { A: '文件名', B: fileName },
        { A: '异常总数', B: meta?.totalAnomalies ?? 0 },
        { A: '已处理', B: meta?.resolvedCount ?? 0 },
        { A: '待处理', B: meta?.pendingCount ?? 0 },
        { A: '', B: '' },
        { A: '异常明细（界面与报告共用同一批数据）', B: '' },
      ];
      const ws = XLSX.utils.json_to_sheet(summary, {
        header: ['A', 'B'],
        skipHeader: true,
      });
      XLSX.utils.sheet_add_json(ws, rows, { origin: -1 });
      ws['!cols'] = [
        { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
        { wch: 45 }, { wch: 55 }, { wch: 30 }, { wch: 16 }, { wch: 40 },
        { wch: 14 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '检查报告');
      XLSX.writeFile(wb, fileName);
      setGenerating(false);
    }, 400);
  };

  const exportHtml = () => {
    setGenerating(true);
    setTimeout(() => {
      const rows = buildExportRows();
      const headCells = Object.keys(rows[0] || {});
      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>训练切分隔离检查报告</title>
<style>
body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 1200px; margin: 0 auto; padding: 32px; color: #374151; background: #fafaf7; }
h1 { color: #1e3a5f; font-family: Georgia, "Songti SC", serif; font-size: 24px; }
.summary { background: white; border: 1px solid #e9e6da; border-radius: 12px; padding: 20px; margin: 16px 0; }
.summary p { margin: 4px 0; font-size: 14px; }
.summary strong { color: #1e3a5f; }
.hint { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin: 12px 0; }
table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e9e6da; border-radius: 12px; overflow: hidden; font-size: 13px; margin-top: 16px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f4f3ed; vertical-align: top; }
th { background: #f1f5fb; color: #1e3a5f; font-weight: 600; font-size: 12px; }
tr:nth-child(even) td { background: #fafaf7; }
.type-duplicate { color: #dc2626; background: #fee2e2; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.type-rule_missing { color: #d97706; background: #fef3c7; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.type-format_error { color: #7c3aed; background: #ede9fe; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.type-leak { color: #be185d; background: #fce7f3; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
.footer { margin-top: 32px; font-size: 12px; color: #6b7280; text-align: center; }
</style>
</head>
<body>
<h1>训练切分隔离检查报告</h1>
<div class="hint">⚠️ 本报告与人工修正工作台共用同一批数据，界面与报告保持一致。</div>
<div class="summary">
  <p><strong>生成时间：</strong>${formatDateTime(new Date().toISOString())}</p>
  <p><strong>批次号：</strong>${currentBatchId}</p>
  <p><strong>文件名：</strong>${fileName}</p>
  <p><strong>异常总数：</strong>${meta?.totalAnomalies ?? 0}</p>
  <p><strong>已处理：</strong>${meta?.resolvedCount ?? 0} · <strong>待处理：</strong>${meta?.pendingCount ?? 0}</p>
</div>
<table>
  <thead><tr>${headCells.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>
    ${rows
      .map(
        (r, i) => `<tr>
          ${headCells
            .map((h) => {
              const val = r[h as keyof typeof r];
              if (h === '异常类型') {
                const t = anomalies[i]?.type;
                return `<td><span class="type-${t}">${val}</span></td>`;
              }
              return `<td>${String(val ?? '')}</td>`;
            })
            .join('')}
        </tr>`,
      )
      .join('')}
  </tbody>
</table>
<div class="footer">报告由训练切分隔离检查系统自动生成 · ${formatDate(new Date().toISOString())}</div>
</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
    }, 400);
  };

  const onExport = () => {
    if (format === 'excel') exportExcel();
    else exportHtml();
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
              生成时间 {formatDateTime(new Date().toISOString())}
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
