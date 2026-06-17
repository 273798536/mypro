import { useMemo, useState } from 'react';
import { FileText, Copy, Download, Check, X, ChevronRight, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useDataStore } from '@/store/useDataStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useParamStore } from '@/store/useParamStore';
import { generateMarkdownReport, downloadMarkdown, copyToClipboard } from '@/utils/markdown';

interface ReportPreviewProps {
  onClose: () => void;
}

export default function ReportPreview({ onClose }: ReportPreviewProps) {
  const { buoyData, anomalies, notes, selectedDataId, selectedAnomalyId, runStatus } = useDataStore();
  const filters = useFilterStore();
  const { getCurrentVersionData } = useParamStore();
  
  const [copied, setCopied] = useState(false);
  
  const paramVersion = getCurrentVersionData();
  const markdownContent = useMemo(() => {
    if (!paramVersion) return '';
    return generateMarkdownReport({
      paramVersion,
      buoyData,
      anomalies,
      notes,
      filters,
      selectedDataId,
      selectedAnomalyId,
      runStatus,
      runTime: new Date().toISOString(),
    });
  }, [paramVersion, buoyData, anomalies, notes, filters, selectedDataId, selectedAnomalyId, runStatus]);

  const handleCopy = async () => {
    const success = await copyToClipboard(markdownContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadMarkdown(markdownContent);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-glow/20">
              <FileText className="w-5 h-5 text-cyan-glow" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Markdown 报告预览</h3>
              <p className="text-xs text-slate-400">
                参数版本 {paramVersion?.version} · 内容与页面状态保持一致
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition-all border border-slate-600"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-success-green" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制到剪贴板
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-glow hover:bg-cyan-400 text-deep-ocean text-sm font-medium transition-all"
            >
              <Download className="w-4 h-4" />
              下载 .md 文件
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 border-r border-slate-700">
            <div className="p-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Markdown 源码</span>
            </div>
            <div className="h-[calc(100%-37px)] overflow-auto p-4">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {markdownContent}
              </pre>
            </div>
          </div>

          <div className="flex-1 min-w-0 bg-white">
            <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">渲染预览</span>
            </div>
            <div className="h-[calc(100%-37px)] overflow-auto p-6">
              <div className="prose prose-sm max-w-none text-slate-800">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 border-b pb-2 mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium text-slate-800 mt-4 mb-2">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-base font-medium text-slate-700 mt-3 mb-2">{children}</h4>,
                    p: ({ children }) => <p className="text-sm text-slate-700 mb-3 leading-relaxed">{children}</p>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 text-slate-600 bg-cyan-50 py-2 pr-2 rounded-r">{children}</blockquote>,
                    table: ({ children }) => <table className="w-full text-sm border-collapse my-4">{children}</table>,
                    th: ({ children }) => <th className="border border-slate-300 px-3 py-2 bg-slate-100 text-left font-medium text-slate-700">{children}</th>,
                    td: ({ children }) => <td className="border border-slate-300 px-3 py-2 text-slate-600">{children}</td>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3 text-sm text-slate-700">{children}</ul>,
                    li: ({ children }) => <li className="text-slate-700">{children}</li>,
                    code: ({ children }) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-cyan-600 font-mono text-xs">{children}</code>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                    hr: () => <hr className="my-6 border-slate-200" />,
                  }}
                >
                  {markdownContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
