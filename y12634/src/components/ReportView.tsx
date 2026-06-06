import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Download, FileJson, FileSpreadsheet, Check, Printer } from 'lucide-react';
import { useProductionStore } from '@/store/productionStore';
import { generateReportSections, generateMandarinExplanation } from '@/utils/reportGenerator';
import { exportCsv, exportJson, exportReportHtml } from '@/utils/exportData';

export function ReportView() {
  const navigate = useNavigate();
  const { productionData } = useProductionStore();
  const sections = generateReportSections(productionData);
  const [copied, setCopied] = useState(false);

  const mandarinText = generateMandarinExplanation(productionData);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mandarinText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    const html = buildStaticHtml(productionData.name, sections, mandarinText);
    exportReportHtml(productionData, html);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition ${
                copied
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制普通话解释'}
            </button>
            <button
              onClick={() => exportCsv(productionData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={() => exportJson(productionData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <FileJson className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={handleExportHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              下载报告
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              打印
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-6 py-10 print:py-6 print:px-0">
        <header className="text-center mb-10">
          <p className="text-xs text-slate-500 tracking-widest mb-2">文保复核报告</p>
          <h1
            className="text-2xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: '"Noto Serif SC", serif' }}
          >
            {productionData.name}
          </h1>
          <p className="text-sm text-slate-500">
            生产线编号：{productionData.id} · 生成时间：{productionData.generatedAt}
          </p>
        </header>

        {sections.map((sec, idx) => {
          const isMandarin = sec.title.includes('普通话解释');
          return (
            <section key={idx} className="mb-8">
              <h2
                className="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200"
                style={{ fontFamily: '"Noto Serif SC", serif' }}
              >
                {sec.title}
              </h2>
              {isMandarin ? (
                <div className="relative rounded-lg border border-sky-200 bg-sky-50 p-5">
                  <div className="absolute top-2 right-3 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-sky-100 text-sky-700">
                    可直接复制
                  </div>
                  <pre className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700 font-sans">
                    {sec.content}
                  </pre>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700 font-sans bg-white rounded border border-slate-200 p-4">
                  {sec.content}
                </pre>
              )}
            </section>
          );
        })}

        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
          本报告数据与泳道图、明细面板同源，评审老师查阅本报告即可理解颜色越界等异常的拦截原因。
        </footer>
      </article>
    </div>
  );
}

function buildStaticHtml(title: string, sections: ReturnType<typeof generateReportSections>, mandarin: string): string {
  const sectionHtml = sections
    .map((s) => {
      const isMandarin = s.title.includes('普通话解释');
      const bodyStyle = isMandarin
        ? 'padding:1.25rem;border:1px solid #bae6fd;background:#f0f9ff;border-radius:0.5rem;white-space:pre-wrap;line-height:1.7;color:#0f172a;font-family:"Noto Sans SC",sans-serif;'
        : 'padding:1rem;border:1px solid #e2e8f0;background:#ffffff;border-radius:0.25rem;white-space:pre-wrap;line-height:1.7;color:#334155;font-family:"Noto Sans SC",sans-serif;';
      return `<section style="margin-bottom:2rem;">
        <h2 style="font-size:1rem;font-weight:700;color:#1e293b;padding-bottom:0.5rem;border-bottom:1px solid #e2e8f0;margin-bottom:0.75rem;font-family:'Noto Serif SC',serif;">${s.title}</h2>
        <div style="${bodyStyle}">${escapeHtml(s.content)}</div>
      </section>`;
    })
    .join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - 文保复核报告</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@500;700&display=swap" rel="stylesheet">
<style>
  body { font-family: "Noto Sans SC", sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1.5rem; color: #0f172a; background: #f8fafc; }
  header { text-align: center; margin-bottom: 2.5rem; }
  header h1 { font-family: "Noto Serif SC", serif; font-size: 1.5rem; margin: 0.5rem 0; }
  header .sub { color: #64748b; font-size: 0.85rem; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 0.7rem; }
</style>
</head>
<body>
  <header>
    <p style="color:#64748b;letter-spacing:0.2em;font-size:0.7rem;margin:0;">文保复核报告</p>
    <h1>${title}</h1>
    <p class="sub">生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </header>
  ${sectionHtml}
  <footer>
    本报告与泳道图、明细面板使用同一批数据，评审老师可直接查阅本报告理解颜色越界等异常拦截原因。<br>
    【可直接复制的普通话解释】${escapeHtml(mandarin.split('\n').slice(0, 5).join(' / '))}
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
