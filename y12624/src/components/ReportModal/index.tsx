import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ExportReport } from '@/types';
import { formatReportForCopy } from '@/utils/report';

interface ReportModalProps {
  report: ExportReport;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'explanation' | 'problems'>('summary');

  const handleCopy = async () => {
    const text = formatReportForCopy(report);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = formatReportForCopy(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `消防疏散箭头校验报告_${new Date().toLocaleDateString('zh-CN')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-3xl max-h-[90vh] flex flex-col m-4">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fire-red/20 rounded">
              <FileText size={20} className="text-fire-red" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-100">校验报告</h2>
              <p className="text-xs text-slate-400">导出时间：{report.exportTime}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          {[
            { key: 'summary', label: '数据汇总' },
            { key: 'explanation', label: '普通话解释' },
            { key: 'problems', label: '问题清单' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-fire-red'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div className="text-3xl font-bold text-fire-success">
                    {report.problemList.filter(p => p.isUsable).length + report.summary.match(/正常记录：(\d+)/)?.[1]}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">可使用记录</div>
                </div>
                <div className="p-4 bg-fire-red/10 rounded-lg border border-fire-red/30">
                  <div className="text-3xl font-bold text-fire-red">
                    {report.problemList.filter(p => !p.isUsable).length}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">不可使用（坐标翻转）</div>
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <h3 className="font-medium text-slate-200 mb-3">详细统计</h3>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                  {report.summary}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'explanation' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-400 mb-2">教研老师专属说明</h3>
                    <p className="text-sm text-slate-300">
                      以下文字可直接复制发送给同事，无需修改
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {report.explanation}
                </pre>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2 px-4 rounded border-2 border-fire-dark bg-fire-dark/20 hover:bg-fire-dark/30 text-blue-400 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? '已复制' : '复制全部说明文字'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'problems' && (
            <div className="space-y-4">
              {report.problemList.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 size={48} className="text-fire-success mx-auto mb-4" />
                  <p className="text-slate-400">太棒了！没有发现任何问题记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {report.problemList.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.isUsable
                          ? 'bg-fire-warning/10 border-fire-warning/30'
                          : 'bg-fire-red/10 border-fire-red/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            item.isUsable
                              ? 'bg-fire-warning/30 text-fire-warning'
                              : 'bg-fire-red/30 text-fire-red'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-200">
                            记录 #{item.id}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.isUsable
                              ? 'bg-fire-warning/20 text-fire-warning'
                              : 'bg-fire-red/20 text-fire-red'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <span className={`text-xs font-medium ${
                          item.isUsable ? 'text-fire-warning' : 'text-fire-red'
                        }`}>
                          {item.isUsable ? '✅ 可使用（需复核）' : '❌ 不可使用'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-300 mb-2">
                        {item.description}
                      </p>

                      {item.remark && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded border border-slate-600">
                          <div className="text-xs text-slate-500 mb-1">
                            【人工备注（原样保留）】
                          </div>
                          <p className="text-sm text-slate-300 italic">
                            "{item.remark}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-2 px-4 rounded border-2 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50 text-slate-200 transition-all flex items-center justify-center gap-2"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? '已复制到剪贴板' : '复制完整报告'}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2 px-4 rounded border-2 border-fire-dark bg-fire-dark/20 hover:bg-fire-dark/30 text-blue-400 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Download size={18} />
            下载报告文件
          </button>
        </div>
      </div>
    </div>
  );
};
