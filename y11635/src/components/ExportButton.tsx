import React, { useRef } from 'react';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { exportReportAsText, exportScoreBreakdown, downloadFile, exportToJSON } from '../utils/export';

export function ExportButton() {
  const { logs, scoreDetails, totalScore, status, failureReason, round } = useGameStore();

  const handleExportReport = () => {
    const report = exportReportAsText({
      title: `防洪棋结算报告 - 回合 ${round}`,
      waterLevelData: logs.map(log => ({
        round: log.round,
        level: log.reservoirLevel,
        safeLine: 70,
        warningLine: 80,
        overflowLine: 90,
      })),
      scoreDetails,
      logs,
      totalScore,
      status,
      failureReason,
    });
    downloadFile(report, '防洪棋结算报告.txt', 'text/plain');
  };

  const handleExportScoreCSV = () => {
    const csv = exportScoreBreakdown({
      title: '得分明细',
      waterLevelData: [],
      scoreDetails,
      logs,
      totalScore,
      status,
      failureReason,
    });
    downloadFile(csv, '得分明细.csv', 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON({
      title: '游戏数据导出',
      waterLevelData: logs.map(log => ({
        round: log.round,
        level: log.reservoirLevel,
        safeLine: 70,
        warningLine: 80,
        overflowLine: 90,
      })),
      scoreDetails,
      logs,
      totalScore,
      status,
      failureReason,
    });
    downloadFile(json, '游戏数据.json', 'application/json');
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
        <Download className="w-5 h-5 text-blue-400" />
        数据导出
      </h3>

      <div className="space-y-2">
        <button
          onClick={handleExportReport}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-slate-700 hover:bg-slate-600 text-slate-200
            border border-slate-600 hover:border-slate-500
            transition-all duration-200"
        >
          <FileText className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <div className="text-sm font-medium">导出结算报告</div>
            <div className="text-xs text-slate-400">文本格式，包含完整游戏记录</div>
          </div>
        </button>

        <button
          onClick={handleExportScoreCSV}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-slate-700 hover:bg-slate-600 text-slate-200
            border border-slate-600 hover:border-slate-500
            transition-all duration-200"
        >
          <BarChart3 className="w-5 h-5 text-green-400" />
          <div className="text-left">
            <div className="text-sm font-medium">导出得分明细</div>
            <div className="text-xs text-slate-400">CSV 格式，可用于数据分析</div>
          </div>
        </button>

        <button
          onClick={handleExportJSON}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-slate-700 hover:bg-slate-600 text-slate-200
            border border-slate-600 hover:border-slate-500
            transition-all duration-200"
        >
          <Download className="w-5 h-5 text-orange-400" />
          <div className="text-left">
            <div className="text-sm font-medium">导出原始数据</div>
            <div className="text-xs text-slate-400">JSON 格式，完整游戏状态</div>
          </div>
        </button>
      </div>
    </div>
  );
}
