import { useState, useMemo } from "react";
import { useSandboxStore } from "@/store/useSandboxStore";
import { FileText, Copy, Check, Download, RefreshCw } from "lucide-react";

export function ReportPanel() {
  const { generateReport, loadSampleData, resetProject, currentProject } =
    useSandboxStore();
  const [copied, setCopied] = useState(false);

  const reportText = useMemo(() => generateReport(), [generateReport, currentProject]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("复制失败", e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentProject.name}-检测报告.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-400" />
          <span className="panel-title">报告生成器</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-600/50 transition-colors"
            title="复制报告"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-accent-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-surface-300" />
            )}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-600/50 transition-colors"
            title="下载报告"
          >
            <Download className="w-3.5 h-3.5 text-surface-300" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-surface-700/50 bg-primary-950/30">
        <p className="text-[11px] text-primary-300 leading-relaxed">
          💡 已自动生成普通话解释的检测报告，可直接复制给同事或甲方，无需重新翻译整理。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="p-5 rounded-xl bg-surface-50 text-surface-900 shadow-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {reportText}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-surface-700/50 space-y-2">
        <button
          onClick={handleCopy}
          className="btn-primary w-full justify-center"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              已复制到剪贴板
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              一键复制报告全文
            </>
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={loadSampleData}
            className="btn-secondary text-xs flex-1 justify-center py-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重新加载示例
          </button>
          <button
            onClick={() => {
              if (confirm("确定要重置项目为空白吗？")) {
                resetProject();
              }
            }}
            className="btn-secondary text-xs flex-1 justify-center py-2"
          >
            <FileText className="w-3.5 h-3.5" />
            空白项目
          </button>
        </div>
      </div>
    </div>
  );
}
