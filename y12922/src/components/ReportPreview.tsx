import { useRef } from 'react';
import { Download, Printer, FileText } from 'lucide-react';

export function ReportPreview({
  html,
  generatedAt,
}: {
  html: string;
  generatedAt?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const exportHtml = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${generatedAt ? new Date(generatedAt).toISOString().slice(0, 10) : 'export'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
  };

  if (!html) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-ink-faint border border-dashed border-ink/15 rounded-sm bg-paper-100">
        <FileText size={28} />
        <p className="text-sm">尚未生成报告</p>
        <p className="text-xs">点击「生成报告」可创建非技术可读的复盘报告</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted">
          {generatedAt
            ? `生成于 ${new Date(generatedAt).toLocaleString('zh-CN')}`
            : '已生成'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={exportHtml}
            className="inline-flex items-center gap-1.5 text-xs text-teal border border-teal/30 px-2.5 py-1 rounded-sm hover:bg-teal-tint"
          >
            <Download size={13} /> 导出 HTML
          </button>
          <button
            onClick={printPdf}
            className="inline-flex items-center gap-1.5 text-xs text-paper-50 bg-teal px-2.5 py-1 rounded-sm hover:bg-teal-soft"
          >
            <Printer size={13} /> 打印为 PDF
          </button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title="报告预览"
        srcDoc={html}
        className="w-full h-[72vh] bg-white border border-ink/10 rounded-sm"
      />
    </div>
  );
}
