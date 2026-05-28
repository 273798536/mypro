import React, { useRef } from 'react';
import { Play, RotateCcw, Download, Camera, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useSimulationStore } from '../store/simulationStore';

export const ActionToolbar: React.FC = () => {
  const { runSimulation, resetSimulation, result, params, isRunning } = useSimulationStore();
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    if (!result || result.timeSeries.length === 0) return;

    const headers = ['时间(s)', '速度(m/s)', '高度(m)'];
    const rows = result.timeSeries.map((_, i) => [
      result.timeSeries[i].toFixed(3),
      result.velocitySeries[i].toFixed(3),
      result.positionSeries[i].toFixed(3),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `雨滴模拟_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportJSON = () => {
    if (!result) return;

    const exportData = {
      params,
      result: {
        terminalVelocity: result.terminalVelocity,
        timeToTerminal: result.timeToTerminal,
        timeToGround: result.timeToGround,
        status: result.status,
        anomalies: result.anomalies,
        dataPoints: result.timeSeries.map((_, i) => ({
          time: result.timeSeries[i],
          velocity: result.velocitySeries[i],
          position: result.positionSeries[i],
        })),
      },
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `雨滴模拟_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleScreenshot = async () => {
    const element = document.getElementById('simulation-container');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#f8fafc',
        scale: 2,
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `雨滴模拟截图_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  const handleExportReport = () => {
    if (!result) return;

    const reportContent = `
雨滴终端速度模拟报告
====================

生成时间: ${new Date().toLocaleString('zh-CN')}
数据来源: ${params.source}

【模拟参数】
- 雨滴半径: ${params.radius} mm
- 空气密度: ${params.airDensity} kg/m³
- 阻力系数: ${params.dragCoefficient}
- 初速度: ${params.initialVelocity} m/s
- 下落高度: ${params.height} m

【计算结果】
- 终端速度: ${result.terminalVelocity.toFixed(2)} m/s
- 达到终端速度时间: ${result.timeToTerminal.toFixed(2)} s
- 落地时间: ${result.timeToGround.toFixed(2)} s
- 计算状态: ${result.status === 'completed' ? '正常完成' : result.status}
- 数据点数: ${result.timeSeries.length}

【异常记录】
${result.anomalies.length === 0 ? '无异常' : result.anomalies.map((a) => `- [${a.severity}] ${a.type}: ${a.message}`).join('\n')}

【修改历史】
${params.modificationHistory.length === 0 ? '无修改' : params.modificationHistory.map((m) => `- ${m.field}: ${m.oldValue} → ${m.newValue} (${m.reason})`).join('\n')}

---
报告由雨滴终端速度模拟器自动生成
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `模拟报告_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            开始模拟
          </button>

          <button
            onClick={resetSimulation}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors duration-200"
          >
            <RotateCcw className="w-5 h-5" />
            重置
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!result || result.timeSeries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-emerald-50 text-emerald-700 rounded-lg font-medium hover:bg-emerald-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={handleExportJSON}
            disabled={!result || result.timeSeries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-violet-50 text-violet-700 rounded-lg font-medium hover:bg-violet-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            JSON
          </button>

          <button
            onClick={handleScreenshot}
            disabled={!result || result.timeSeries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-amber-50 text-amber-700 rounded-lg font-medium hover:bg-amber-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            截图
          </button>

          <button
            onClick={handleExportReport}
            disabled={!result || result.timeSeries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 text-sm bg-rose-50 text-rose-700 rounded-lg font-medium hover:bg-rose-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            报告
          </button>
        </div>
      </div>
    </div>
  );
};
