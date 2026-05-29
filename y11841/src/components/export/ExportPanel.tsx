import React, { useState } from 'react';
import { Download, FileText, Table, Copy, CheckCircle } from 'lucide-react';
import type { ExportReport } from '../../data/types';
import { exportToCSV, exportToJSON, downloadFile } from '../../utils/exportGenerator';
import { cn } from '@/lib/utils';

interface ExportPanelProps {
  report: ExportReport;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ report }) => {
  const [copied, setCopied] = useState(false);

  const handleExportCSV = () => {
    const csv = exportToCSV(report);
    const filename = `冷链装车培训记录_${report.levelOriginalName}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(report);
    const filename = `冷链装车培训记录_${report.levelOriginalName}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadFile(json, filename, 'application/json');
  };

  const handleCopyResult = () => {
    const resultText = `
【冷链装车培训结果】
关卡：${report.levelOriginalName}
学员：${report.playerName}
完成时间：${report.completionTime}
总用时：${Math.floor(report.totalTimeUsed / 60)}分${report.totalTimeUsed % 60}秒

核心问题：温层混放有没有被拦住？
${report.zoneMismatchDetected
  ? `❌ 否，共检测到 ${report.zoneMismatchCount} 处温层混放问题`
  : '✅ 是，未检测到温层混放问题'}

其他问题：
- 卸货顺序问题：${report.deliveryOrderIssues.length} 处
- 是否超时：${report.timeoutOccurred ? '是' : '否'}
- 最高温度：${report.temperatureMax.toFixed(1)}°C
    `.trim();

    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-6">
      <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
        <FileText className="w-5 h-5 text-cold-chain-primary" />
        培训结果导出
      </h2>

      <div className="mb-6 p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
        <h3 className="font-mono font-bold text-cold-chain-primary mb-3">
          🎯 物流培训主管最关心的问题
        </h3>
        <div className="p-3 bg-cold-chain-primary/10 rounded-lg border border-cold-chain-primary/30">
          <p className="text-sm text-gray-300 font-mono mb-2">
            <span className="text-gray-400">问：</span>温层混放有没有被拦住？
          </p>
          <p className={cn(
            'text-lg font-bold font-mono',
            report.zoneMismatchDetected ? 'text-cold-chain-danger' : 'text-cold-chain-success'
          )}>
            {report.zoneMismatchDetected
              ? `❌ 否，共检测到 ${report.zoneMismatchCount} 处温层混放问题`
              : '✅ 是，未检测到温层混放问题，所有货物均按正确温层放置'}
          </p>
        </div>
      </div>

      {report.zoneMismatchDetected && (
        <div className="mb-6 p-4 bg-cold-chain-danger/10 rounded-lg border border-cold-chain-danger/30">
          <h3 className="font-mono font-bold text-cold-chain-danger mb-3">
            ⚠️ 温层混放明细
          </h3>
          <div className="space-y-2">
            {report.zoneMismatchDetails.map((detail, index) => (
              <div
                key={index}
                className="p-3 bg-cold-chain-dark/50 rounded-lg border border-cold-chain-danger/20"
              >
                <p className="text-sm font-mono">
                  <span className="text-gray-400">#{index + 1}</span>{' '}
                  <span className="text-white">「{detail.cargoBoxOriginalName}」</span>{' '}
                  应放在<span className="text-cold-chain-success">{detail.expectedZone}</span>，
                  实际放在<span className="text-cold-chain-danger">{detail.actualZone}</span>的
                  <span className="text-white">「{detail.compartmentOriginalName}」</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
          <div className="text-xs text-gray-400 font-mono mb-1">关卡名称</div>
          <div className="text-sm font-mono text-white truncate">{report.levelOriginalName}</div>
        </div>
        <div className="p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
          <div className="text-xs text-gray-400 font-mono mb-1">学员姓名</div>
          <div className="text-sm font-mono text-white">{report.playerName}</div>
        </div>
        <div className="p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
          <div className="text-xs text-gray-400 font-mono mb-1">完成时间</div>
          <div className="text-sm font-mono text-white">{report.completionTime}</div>
        </div>
        <div className="p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border">
          <div className="text-xs text-gray-400 font-mono mb-1">总用时</div>
          <div className="text-sm font-mono text-white">
            {Math.floor(report.totalTimeUsed / 60)}分{report.totalTimeUsed % 60}秒
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-cold-chain-primary hover:bg-cold-chain-primary/80 rounded-lg font-mono text-sm transition-colors"
        >
          <Table className="w-4 h-4" />
          导出 CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="flex items-center gap-2 px-4 py-2 bg-cold-chain-chilled hover:bg-cold-chain-chilled/80 rounded-lg font-mono text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          导出 JSON
        </button>
        <button
          onClick={handleCopyResult}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-colors',
            copied
              ? 'bg-cold-chain-success text-white'
              : 'bg-cold-chain-panel hover:bg-cold-chain-panel/80 border border-cold-chain-border'
          )}
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              复制结果
            </>
          )}
        </button>
      </div>

      <div className="mt-6 p-4 bg-cold-chain-dark rounded-lg border border-cold-chain-border max-h-60 overflow-y-auto">
        <h3 className="font-mono text-sm font-bold text-gray-300 mb-2">操作历史记录</h3>
        <div className="space-y-1">
          {report.operationHistory.map((op, index) => (
            <div key={index} className="text-xs text-gray-400 font-mono py-1 border-b border-cold-chain-border/30 last:border-0">
              {op}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
