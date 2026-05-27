import { useState } from 'react';
import { FileText, X, Download, Printer } from 'lucide-react';
import { useExperimentStore } from '../store/useExperimentStore';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const { result, diskParams, hangingMass, dataPoints, anomalies } = useExperimentStore();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const validPoints = dataPoints.filter((p) => p.isValid && p.time > 0 && p.angularVelocity > 0);
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved);

  const generateReportText = () => {
    let report = '='.repeat(60) + '\n';
    report += '           刚体转动惯量测算报告\n';
    report += '='.repeat(60) + '\n\n';
    report += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

    report += '-'.repeat(40) + '\n';
    report += '【1】实验参数\n';
    report += '-'.repeat(40) + '\n\n';
    report += `转盘半径: ${diskParams.radius} ${diskParams.radiusUnit}\n`;
    report += `转盘质量: ${diskParams.mass} ${diskParams.massUnit}\n`;
    report += `砝码质量: ${hangingMass.mass} ${hangingMass.massUnit}\n`;
    report += `绕线半径: ${hangingMass.stringRadius} ${hangingMass.stringRadiusUnit}\n\n`;

    report += '-'.repeat(40) + '\n';
    report += '【2】实验数据\n';
    report += '-'.repeat(40) + '\n\n';
    report += '序号\t时间(s)\t角速度(rad/s)\n';
    validPoints.forEach((p, i) => {
      report += `${i + 1}\t${p.time}\t${p.angularVelocity}\n`;
    });
    report += `\n有效数据点: ${validPoints.length} 个\n\n`;

    if (result) {
      report += '-'.repeat(40) + '\n';
      report += '【3】计算结果\n';
      report += '-'.repeat(40) + '\n\n';
      report += `角加速度: ${result.angularAcceleration.toFixed(6)} rad/s²\n`;
      report += `未修正转动惯量: ${result.momentOfInertiaUncorrected.toExponential(6)} kg·m²\n`;
      report += `摩擦转矩: ${result.frictionTorque.toExponential(6)} N·m\n`;
      report += `修正后转动惯量: ${result.momentOfInertia.toExponential(6)} kg·m²\n`;
      if (result.theoreticalValue !== undefined) {
        report += `理论转动惯量: ${result.theoreticalValue.toExponential(6)} kg·m²\n`;
      }
      if (result.percentageError !== undefined) {
        report += `相对误差: ${result.percentageError.toFixed(2)} %\n`;
      }
      report += `\n综合评分: ${result.score} / 100\n\n`;

      report += '-'.repeat(40) + '\n';
      report += '【4】评分明细\n';
      report += '-'.repeat(40) + '\n\n';
      result.scoreDetails.forEach((d) => {
        report += `${d.category}: ${d.score}/${d.maxScore} - ${d.description}\n`;
      });
      report += '\n';

      report += '-'.repeat(40) + '\n';
      report += '【5】计算步骤\n';
      report += '-'.repeat(40) + '\n\n';
      result.calculationSteps.forEach((step, i) => {
        report += `${i + 1}. ${step}\n`;
      });
      report += '\n';
    }

    if (unresolvedAnomalies.length > 0) {
      report += '-'.repeat(40) + '\n';
      report += '【6】异常说明\n';
      report += '-'.repeat(40) + '\n\n';
      unresolvedAnomalies.forEach((a, i) => {
        report += `${i + 1}. [${a.severity.toUpperCase()}] ${a.message}\n`;
        report += `   建议: ${a.suggestion}\n\n`;
      });
    }

    report += '='.repeat(60) + '\n';
    report += '                    报告结束\n';
    report += '='.repeat(60) + '\n';

    return report;
  };

  const handleDownload = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const reportText = generateReportText();
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `转动惯量测算报告_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsGenerating(false);
    }, 500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-slate-100">测算报告预览</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              {isGenerating ? '生成中...' : '下载'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              打印
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-slate-900 rounded-lg p-6 font-mono text-sm text-slate-300 whitespace-pre-wrap">
            {generateReportText()}
          </div>
        </div>
      </div>
    </div>
  );
}
