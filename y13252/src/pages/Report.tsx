import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Copy, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useComplaintStore } from '../store/useComplaintStore.js';

export default function Report() {
  const navigate = useNavigate();
  const { reportContent, reportVersion, selectedComplaintId, fetchReport, loading, complaints } = useComplaintStore();
  const [copied, setCopied] = useState(false);

  const selectedComplaint = complaints.find(c => c.id === selectedComplaintId);

  useEffect(() => {
    if (selectedComplaintId && !reportContent) {
      fetchReport(selectedComplaintId);
    }
  }, [selectedComplaintId, reportContent, fetchReport]);

  const handleCopy = async () => {
    if (!reportContent) return;
    await navigator.clipboard.writeText(reportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!reportContent || !selectedComplaintId) return;
    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `投诉报告_${selectedComplaintId}_v${reportVersion}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading && !reportContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1e3a5f] mb-3" />
          <p className="text-slate-600">正在生成报告...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <div className="h-6 w-px bg-slate-600"></div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="font-semibold">Markdown 报告</span>
            {selectedComplaint && (
              <span className="text-slate-400 text-sm">
                - {selectedComplaint.title}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            版本 v{reportVersion}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>
      </div>
      
      <div className="flex-1 p-8 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {reportContent ? (
            <div className="markdown-report">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reportContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <p className="text-lg mb-2">暂无报告内容</p>
              <p className="text-sm">请先在首页选择投诉记录并点击"查看Markdown报告"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
