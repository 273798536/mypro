import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Download, Copy, Check, RefreshCw } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { downloadReport, copyToClipboard } from '../utils/reportGenerator';

const MarkdownReport: React.FC = () => {
  const {
    rawLogs,
    fieldMappingResult,
    thresholdParamsA,
    thresholdParamsB,
    resultsA,
    resultsB,
    qualityIssues,
    overrideAnalysis,
    currentReport,
    fileName,
    generateAnalysisReport,
    isAnalyzing,
  } = useAnalysisStore();

  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      generateAnalysisReport();
      setGenerating(false);
    }, 200);
  };

  const handleCopy = async () => {
    if (!currentReport) return;
    const success = await copyToClipboard(currentReport.markdownContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!currentReport) return;
    downloadReport(currentReport);
  };

  useEffect(() => {
    if (
      rawLogs.length > 0 &&
      resultsA.length > 0 &&
      fieldMappingResult &&
      !currentReport
    ) {
      generateAnalysisReport();
    }
  }, [rawLogs, resultsA, fieldMappingResult, currentReport, generateAnalysisReport]);

  if (rawLogs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-900" />
          Markdown 分析报告
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating || isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-sm text-sm transition-colors disabled:opacity-50"
          >
            {generating || isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            重新生成
          </button>
          <button
            onClick={handleCopy}
            disabled={!currentReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-sm text-sm transition-colors disabled:bg-gray-300"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                复制内容
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={!currentReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-sm text-sm transition-colors disabled:bg-gray-300"
          >
            <Download className="w-4 h-4" />
            下载 .md
          </button>
        </div>
      </div>

      {currentReport ? (
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">报告预览</span>
            <span className="text-xs text-gray-500">
              生成时间: {currentReport.generatedAt}
            </span>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                table: ({ children }) => (
                  <table className="border-collapse w-full text-sm my-4">
                    {children}
                  </table>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-300 px-3 py-2 bg-gray-50 text-left font-medium text-gray-700">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-300 px-3 py-2 text-gray-600">
                    {children}
                  </td>
                ),
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-medium text-gray-700 mt-3 mb-2">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-gray-600 mb-2 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-gray-600 space-y-1 mb-4">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-gray-600 space-y-1 mb-4">
                    {children}
                  </ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-500 my-4">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-700">
                    {children}
                  </code>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-800">{children}</strong>
                ),
              }}
            >
              {currentReport.markdownContent}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-sm p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">点击"重新生成"按钮生成分析报告</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-sm transition-colors"
          >
            {generating ? '生成中...' : '生成报告'}
          </button>
        </div>
      )}

      {currentReport && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
            <div className="text-xl font-bold text-gray-800">{currentReport.totalRecords}</div>
            <div className="text-xs text-gray-500">总记录数</div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm text-center">
            <div className="text-xl font-bold text-blue-600">{currentReport.validRecords}</div>
            <div className="text-xs text-blue-500">有效记录</div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-center">
            <div className="text-xl font-bold text-red-600">{currentReport.warningCount}</div>
            <div className="text-xs text-red-500">预警记录</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm text-center">
            <div className="text-xl font-bold text-amber-600">{currentReport.overrideCount}</div>
            <div className="text-xs text-amber-500">人工改判</div>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm text-center">
            <div className="text-xl font-bold text-gray-600">{currentReport.qualityIssueCount}</div>
            <div className="text-xs text-gray-500">质量问题</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownReport;
