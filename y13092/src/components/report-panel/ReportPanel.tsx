import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '@/store/useAppStore';
import { FileText, Download, Copy, RefreshCw, Check } from 'lucide-react';

export default function ReportPanel() {
  const { generateMarkdownReport } = useAppStore();
  const [copied, setCopied] = useState(false);

  const markdown = generateMarkdownReport();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `碰撞预审报告_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-200">预审报告</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
          >
            <Download size={12} />
            导出
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-900 rounded border border-slate-700 p-4">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg font-bold text-slate-100 mb-4 pb-2 border-b border-slate-700">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-slate-200 mt-4 mb-2 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-500 rounded" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-medium text-slate-300 mt-3 mb-1.5">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-slate-400 leading-relaxed mb-2">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="text-sm text-slate-400 space-y-1.5 ml-4 mb-2 list-disc">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="text-slate-400">
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong className="text-slate-200 font-medium">
                  {children}
                </strong>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-yellow-500 pl-3 py-1 my-2 bg-yellow-500/5 rounded-r">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 bg-slate-800 rounded text-xs text-slate-300 font-mono">
                  {children}
                </code>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>报告基于当前状态实时生成</span>
        <button
          onClick={() => {}}
          className="flex items-center gap-1 hover:text-slate-400 transition-colors"
        >
          <RefreshCw size={12} />
          刷新
        </button>
      </div>
    </div>
  );
}
