import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Copy, Check, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore';
import { MarkdownPreview } from '../components/MarkdownPreview';
import { downloadMarkdown, copyToClipboard } from '../utils/markdown';
import { STATUS_LABELS } from '../utils/constants';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { complaints, generateMarkdownReport, validateConsistency, consistencyIssues } = useComplaintStore();
  const [copied, setCopied] = useState(false);
  const [validating, setValidating] = useState(false);

  const markdown = useMemo(() => generateMarkdownReport(), [complaints]);

  const handleDownload = () => {
    const date = new Date().toISOString().split('T')[0];
    downloadMarkdown(markdown, `雨水口积淤公示清单_${date}.md`);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleValidate = () => {
    setValidating(true);
    validateConsistency();
    setTimeout(() => setValidating(false), 1000);
  };

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    processing: complaints.filter(c => c.status === 'processing').length,
    forPublication: complaints.filter(c => c.status === 'for_publication').length,
    publicized: complaints.filter(c => c.status === 'publicized').length,
    withMeetingNotes: complaints.filter(c => c.meetingNotes.length > 0).length,
    sameStreet: complaints.filter(c => c.mergeStatus === 'same_street').length,
    merged: complaints.filter(c => c.mergeStatus === 'merged').length,
  }), [complaints]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">公示清单报告</h1>
                <p className="text-xs text-slate-500">生成完整的Markdown格式报告</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} />
                数据校验
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                下载报告
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {consistencyIssues.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">发现数据一致性问题</h3>
                <ul className="mt-2 text-sm text-amber-800 space-y-1">
                  {consistencyIssues.map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-700">系统已自动修复，请刷新页面查看最新数据。</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">总记录</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-slate-500 mt-1">{STATUS_LABELS.pending}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="text-xs text-slate-500 mt-1">{STATUS_LABELS.processing}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-purple-600">{stats.forPublication}</div>
            <div className="text-xs text-slate-500 mt-1">{STATUS_LABELS.for_publication}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-emerald-600">{stats.publicized}</div>
            <div className="text-xs text-slate-500 mt-1">{STATUS_LABELS.publicized}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-indigo-600">{stats.withMeetingNotes}</div>
            <div className="text-xs text-slate-500 mt-1">会议纪要</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-orange-600">{stats.sameStreet}</div>
            <div className="text-xs text-slate-500 mt-1">同街口多单</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-600">{stats.merged}</div>
            <div className="text-xs text-slate-500 mt-1">已归并</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">报告预览</h2>
              <span className="text-xs text-slate-500 ml-auto">
                生成时间: {new Date().toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
          <div className="p-6 max-h-[calc(100vh-400px)] overflow-y-auto">
            <MarkdownPreview content={markdown} />
          </div>
        </div>
      </main>
    </div>
  );
};
