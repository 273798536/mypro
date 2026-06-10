import { useState } from 'react';
import { FileDown, Eye, AlertTriangle, Info, CheckCircle2, FileText, Table, History, Download, Printer, ExternalLink } from 'lucide-react';
import { useBatchStore } from '../store/batchStore';
import { triggerHtmlExport, triggerCsvExport, triggerPdfExportHint, buildHtmlReport } from '../utils/exporter';
import type { DataQualityIssue, ExportRecord } from '../../shared/types';

const severityStyles: Record<string, { chip: string; icon: typeof Info; border: string; bg: string }> = {
  error: { chip: 'chip-rose', icon: AlertTriangle, border: 'border-l-rose-400', bg: 'bg-rose-50' },
  warning: { chip: 'chip-amber', icon: AlertTriangle, border: 'border-l-amber-400', bg: 'bg-amber-50/60' },
  info: { chip: 'chip-ink', icon: Info, border: 'border-l-ink-400', bg: 'bg-ink-50' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function IssueCard({ d }: { d: DataQualityIssue }) {
  const s = severityStyles[d.severity];
  const Icon = s.icon;
  return (
    <div className={`rounded-lg border border-ink-100 border-l-4 ${s.border} ${s.bg} p-4`}>
      <div className="mb-2 flex items-start gap-3">
        <Icon size={18} className={d.severity === 'error' ? 'text-rose-600' : d.severity === 'warning' ? 'text-amber-600' : 'text-ink-600'} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-ink-900">{d.friendlyMessage}</span>
            <span className={s.chip}>
              {d.severity === 'error' ? '需处理' : d.severity === 'warning' ? '请关注' : '说明'}
            </span>
          </div>
        </div>
      </div>
      <div className="ml-8 space-y-1 text-sm">
        <div className="text-ink-700">
          <span className="font-medium text-ink-800">可能影响：</span>{d.impact}
        </div>
        <div className="text-moss-700">
          <span className="font-medium text-moss-800">建议：</span>{d.suggestion}
        </div>
        <div className="text-[11px] text-ink-400 mt-1">系统代码：{d.code}（仅供排查用）</div>
      </div>
    </div>
  );
}

export default function ExportPage() {
  const batch = useBatchStore((s) => s.currentBatch);
  const addExportRecord = useBatchStore((s) => s.addExportRecord);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleHtml = () => {
    const fileName = triggerHtmlExport(batch);
    addExportRecord({ id: 'exp-' + Date.now(), exportedAt: new Date().toISOString(), format: 'html', fileName, batchName: batch.batchName });
    showToast(`已导出：${fileName}`);
  };

  const handleCsv = () => {
    const fileName = triggerCsvExport(batch);
    addExportRecord({ id: 'exp-' + Date.now(), exportedAt: new Date().toISOString(), format: 'csv', fileName, batchName: batch.batchName });
    showToast(`已导出：${fileName}`);
  };

  const handlePdf = () => {
    const fileName = triggerPdfExportHint(batch);
    addExportRecord({ id: 'exp-' + Date.now(), exportedAt: new Date().toISOString(), format: 'pdf', fileName, batchName: batch.batchName });
    setPreviewOpen(true);
    showToast('已生成预览，在预览窗口使用浏览器打印保存为 PDF');
  };

  const confCount = batch.annotations.filter((a) => a.confirmed).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {toast && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-3 text-sm text-white shadow-lg animate-fade-in-up">
          <CheckCircle2 size={16} className="text-moss-400" /> {toast}
        </div>
      )}

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-500 mb-1.5">Step 4 · 报告导出</div>
          <h1 className="font-serif text-3xl font-semibold text-ink-900">导出给非技术人员看的报告</h1>
          <p className="mt-2 text-ink-500 max-w-2xl">
            所有缺失原因都用通俗语言解释，不出现字段名和缩写。导出文件可直接转给老师、同事或客户。
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <section className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <h2 className="sub-title">数据质量说明（非技术语言）</h2>
            </div>
            <p className="mb-4 text-sm text-ink-500">以下内容会原样出现在导出报告中，老师或同事不需要懂代码就能看懂。</p>
            <div className="space-y-3">
              {batch.dataQuality.map((d, i) => (
                <IssueCard key={i} d={d} />
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-ink-700" />
                <h2 className="sub-title">报告预览</h2>
              </div>
              <button onClick={() => setPreviewOpen(true)} className="btn-secondary">
                <ExternalLink size={16} /> 新窗口预览
              </button>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-6 max-h-[480px] overflow-auto scrollbar-thin">
              <h3 className="font-serif text-2xl font-semibold text-ink-900 border-b-2 border-ink-800 pb-2 mb-4">{batch.batchName}</h3>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div><span className="text-ink-500">批次编号：</span><span className="font-medium">{batch.id}</span></div>
                <div><span className="text-ink-500">标注进度：</span><span className="font-medium">{confCount} / {batch.annotations.length} 条已确认</span></div>
                <div><span className="text-ink-500">创建时间：</span><span>{formatDate(batch.createdAt)}</span></div>
                <div><span className="text-ink-500">最后更新：</span><span>{formatDate(batch.updatedAt)}</span></div>
              </div>
              <h4 className="font-serif text-lg font-semibold text-ink-900 mt-6 mb-2 border-l-4 border-amber-500 pl-2">一、数据质量说明</h4>
              <div className="space-y-2">
                {batch.dataQuality.slice(0, 2).map((d, i) => (
                  <div key={i} className="text-sm text-ink-700">
                    <span className="font-medium text-ink-900">● {d.friendlyMessage}</span>
                    <span className="text-ink-500"> — {d.impact}</span>
                  </div>
                ))}
              </div>
              <h4 className="font-serif text-lg font-semibold text-ink-900 mt-6 mb-2 border-l-4 border-amber-500 pl-2">二、补录实验信息</h4>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div><span className="text-ink-500">反应条件：</span>{batch.supplementaryInfo.reactionConditions || '未填写'}</div>
                <div><span className="text-ink-500">反应时长：</span>{batch.supplementaryInfo.reactionTime ? `${batch.supplementaryInfo.reactionTime} ${batch.supplementaryInfo.reactionTimeUnit}` : '未记录（已说明）'}</div>
                <div><span className="text-ink-500">空白对照：</span>{batch.supplementaryInfo.blankControlNote || '未做（已说明）'}</div>
                <div><span className="text-ink-500">操作人员：</span>{batch.supplementaryInfo.operator}</div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileDown size={18} className="text-ink-700" />
              <h2 className="sub-title">导出格式</h2>
            </div>
            <div className="space-y-2">
              <button onClick={handleHtml} className="w-full btn-primary justify-start">
                <FileText size={16} />
                <div className="text-left flex-1">
                  <div>HTML 报告（推荐）</div>
                  <div className="text-xs font-normal text-ink-200/80">浏览器直接打开，样式最好</div>
                </div>
              </button>
              <button onClick={handlePdf} className="w-full btn-secondary justify-start">
                <Printer size={16} />
                <div className="text-left flex-1">
                  <div>PDF 报告</div>
                  <div className="text-xs font-normal text-ink-500">预览后用浏览器"打印→另存为PDF"</div>
                </div>
              </button>
              <button onClick={handleCsv} className="w-full btn-secondary justify-start">
                <Table size={16} />
                <div className="text-left flex-1">
                  <div>CSV 标注表</div>
                  <div className="text-xs font-normal text-ink-500">用 Excel 打开继续处理</div>
                </div>
              </button>
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <History size={18} className="text-ink-700" />
              <h2 className="sub-title">导出记录</h2>
            </div>
            {batch.exportHistory.length === 0 ? (
              <p className="text-sm text-ink-500">还没有导出记录</p>
            ) : (
              <div className="space-y-2">
                {[...batch.exportHistory].reverse().map((e: ExportRecord) => (
                  <div key={e.id} className="rounded-md border border-ink-100 bg-ink-50/50 p-3">
                    <div className="flex items-center gap-2">
                      <Download size={14} className="text-moss-600" />
                      <span className="text-sm font-medium text-ink-800">{e.fileName}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-500">
                      <span className="uppercase">{e.format}</span>
                      <span>·</span>
                      <span>{formatDate(e.exportedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/60 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="h-[90vh] w-full max-w-5xl rounded-xl bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <span className="font-medium text-ink-800">报告预览（可使用浏览器打印保存为 PDF）</span>
              <div className="flex gap-2">
                <button onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(buildHtmlReport(batch)); w.document.close(); } }} className="btn-secondary"><ExternalLink size={14} /> 新窗口</button>
                <button onClick={() => window.print()} className="btn-secondary"><Printer size={14} /> 打印 / 存 PDF</button>
                <button onClick={() => setPreviewOpen(false)} className="btn-ghost">关闭</button>
              </div>
            </div>
            <iframe title="report" className="flex-1 w-full border-0" srcDoc={buildHtmlReport(batch)} />
          </div>
        </div>
      )}
    </div>
  );
}
