import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';

export default function ReportPanel() {
  const { state, generateReport, filteredRecords, summaryStats, clearPersistence } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'success' | 'error'>('idle');

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      generateReport();
      setIsGenerating(false);
    }, 200);
  }, [generateReport]);

  const handleCopy = useCallback(async () => {
    if (!state.reportContent) return;
    try {
      await navigator.clipboard.writeText(state.reportContent);
      setCopyFeedback('success');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = state.reportContent;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyFeedback('success');
      } catch {
        setCopyFeedback('error');
      }
    }
    setTimeout(() => setCopyFeedback('idle'), 2000);
  }, [state.reportContent]);

  const handleDownload = useCallback(() => {
    if (!state.reportContent) return;
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + state.reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `绿色债券募集款风险预警报告_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.reportContent]);

  const handleClearData = useCallback(() => {
    if (window.confirm('确认清除所有本地持久化数据？\n将恢复为初始 Mock 数据，已添加的备注、撤回、报告都将丢失。')) {
      clearPersistence();
    }
  }, [clearPersistence]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">沟通用 Markdown 报告</h3>
            <p className="text-xs text-slate-500 mt-1">
              基于当前筛选条件（{filteredRecords.length} 条记录）生成，可直接用于会议沟通
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state.reportContent && (
              <>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  {showPreview ? '查看源码' : '预览渲染'}
                </button>
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                    copyFeedback === 'success'
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : copyFeedback === 'error'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copyFeedback === 'success' ? '已复制' : copyFeedback === 'error' ? '复制失败' : '复制全文'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-bond-600 rounded-md hover:bg-bond-700 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载 .md (UTF-8)
                </button>
              </>
            )}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-1.5 text-sm font-medium text-white bg-bond-600 rounded-md hover:bg-bond-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isGenerating ? '生成中...' : state.reportContent ? '重新生成' : '生成报告'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>记录：{filteredRecords.length} 条</span>
          <span>高风险：{summaryStats.highRisk}</span>
          <span>异常：{summaryStats.anomalyCount}</span>
          <span>含撤回：{summaryStats.withdrawalCount}</span>
          <span>币种错误：{summaryStats.currencyErrorCount}</span>
          <span className="ml-auto flex items-center gap-1 text-bond-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            数据已持久化至 localStorage
          </span>
          <button
            onClick={handleClearData}
            className="text-slate-400 hover:text-red-600 underline"
          >
            重置为初始数据
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        {!state.reportContent ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-bond-50 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-bond-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-slate-700 font-medium mb-1">尚未生成报告</div>
            <div className="text-sm text-slate-500 max-w-sm mb-4">
              报告将包含风险汇总表格、重点关注记录详情（含撤回关联）、判断变更历史、全部记录清单。不是功能清单，是可以直接拿去和资金主管、风控部门沟通的文档。
            </div>
            <button
              onClick={handleGenerate}
              className="px-6 py-2 text-sm font-medium text-white bg-bond-600 rounded-md hover:bg-bond-700"
            >
              立即生成 Markdown 报告
            </button>
          </div>
        ) : showPreview ? (
          <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-800 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-600 prose-blockquote:text-slate-500 prose-blockquote:border-l-bond-500 prose-th:bg-slate-50 prose-th:border prose-th:border-slate-200 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2 prose-table:border-collapse prose-a:text-bond-600 prose-hr:border-slate-200 prose-strong:text-slate-800">
            <ReactMarkdown>{state.reportContent}</ReactMarkdown>
          </div>
        ) : (
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-words scrollbar-thin max-h-full">
            <code>{state.reportContent}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
