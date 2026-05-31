import { useState, useRef, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import {
  FileText,
  Download,
  Share2,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Link2,
  Copy,
  Check,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import {
  getIssueTypeLabel,
  getSeverityColor,
  getSeverityBgColor,
  formatTorqueValue,
} from '../utils/torqueEngine';

export const ReportPage = () => {
  const { generateReport, currentReport, robotConfig, torqueResults, issues } = useAppStore();
  const reportRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentReport) {
      generateReport();
    }
  }, [currentReport, generateReport]);

  const handleCopyLink = () => {
    const reportUrl = `${window.location.origin}/report/${currentReport?.id || 'demo'}`;
    navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#1D2129',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`torque-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const report = currentReport || {
    title: `机器人关节扭矩验算报告 - ${new Date().toLocaleDateString('zh-CN')}`,
    createdAt: new Date().toISOString(),
    summary: {
      totalJoints: robotConfig?.joints.length || 6,
      overLimitJoints: torqueResults.filter((r) => r.isOverLimit).length,
      criticalIssues: issues.filter((i) => i.severity === 'critical').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      recommendations: [
        '建议优先修复负载缺失问题，确保扭矩计算准确性',
        '优化J2关节轨迹规划，减少扭矩超限次数',
        '确认夹具配置记录，避免混用导致的计算偏差',
        '建议增加数据校验环节，减少人工维护数据不一致',
      ],
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-industrial-600">
      <Navbar />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary-400" />
              <div>
                <h1 className="text-xl font-bold text-white font-mono">验算报告</h1>
                <p className="text-xs text-industrial-300">
                  可直接转发给相关同事，包含完整验算口径
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-industrial-500 hover:bg-industrial-400 text-white text-sm rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-success-400" /> : <Share2 className="w-4 h-4" />}
                {copied ? '已复制' : '分享链接'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-industrial-500 hover:bg-industrial-400 text-white text-sm rounded-lg transition-colors"
              >
                <Printer className="w-4 h-4" />
                打印
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors glow-primary"
              >
                <Download className="w-4 h-4" />
                导出 PDF
              </button>
            </div>
          </div>

          <div ref={reportRef} className="bg-industrial-700 rounded-lg p-8 border border-industrial-500">
            <div className="text-center mb-8 pb-6 border-b border-industrial-500">
              <h2 className="text-2xl font-bold text-white font-mono mb-2">
                {report.title}
              </h2>
              <div className="flex items-center justify-center gap-6 text-xs text-industrial-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(report.createdAt).toLocaleString('zh-CN')}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  ROBOT-TORQUE 系统自动生成
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-industrial-600 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white font-mono">
                  {report.summary.totalJoints}
                </p>
                <p className="text-xs text-industrial-400 mt-1">验算关节数</p>
              </div>
              <div className="bg-danger-500/10 rounded-lg p-4 text-center border border-danger-500/30">
                <p className="text-3xl font-bold text-danger-400 font-mono">
                  {report.summary.overLimitJoints}
                </p>
                <p className="text-xs text-industrial-400 mt-1">超限关节</p>
              </div>
              <div className="bg-danger-500/20 rounded-lg p-4 text-center border border-danger-500/50">
                <p className="text-3xl font-bold text-danger-500 font-mono">
                  {report.summary.criticalIssues}
                </p>
                <p className="text-xs text-industrial-400 mt-1">严重问题</p>
              </div>
              <div className="bg-warning-500/10 rounded-lg p-4 text-center border border-warning-500/30">
                <p className="text-3xl font-bold text-warning-400 font-mono">
                  {report.summary.warnings}
                </p>
                <p className="text-xs text-industrial-400 mt-1">警告</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white font-mono mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-danger-500" />
                问题追溯
              </h3>
              <div className="space-y-3">
                {issues.slice(0, 10).map((issue, index) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-lg border ${getSeverityBgColor(issue.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-industrial-400">
                            #{index + 1}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${getSeverityColor(issue.severity)} bg-current/10`}
                          >
                            {getIssueTypeLabel(issue.type)}
                          </span>
                          <span className="text-xs text-industrial-400">
                            {issue.position}
                          </span>
                        </div>
                        <p className="text-sm text-industrial-200">{issue.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-industrial-400">
                          <span>记录编号: {issue.referenceId}</span>
                          <span>时间: {issue.timestamp}</span>
                          <button className="flex items-center gap-1 text-primary-400 hover:text-primary-300">
                            <Link2 className="w-3 h-3" />
                            查看原始记录
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white font-mono mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-400" />
                扭矩验算结果摘要
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-industrial-500">
                      <th className="text-left py-2 px-3 text-industrial-400 font-mono">
                        关节
                      </th>
                      <th className="text-right py-2 px-3 text-industrial-400 font-mono">
                        最大扭矩
                      </th>
                      <th className="text-right py-2 px-3 text-industrial-400 font-mono">
                        阈值
                      </th>
                      <th className="text-right py-2 px-3 text-industrial-400 font-mono">
                        超限率
                      </th>
                      <th className="text-center py-2 px-3 text-industrial-400 font-mono">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {torqueResults.map((result) => (
                      <tr key={result.jointId} className="border-b border-industrial-600">
                        <td className="py-2 px-3 text-white font-mono">
                          {result.jointName}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            result.isOverLimit ? 'text-danger-400' : 'text-white'
                          }`}
                        >
                          {formatTorqueValue(result.maxTorque)}
                        </td>
                        <td className="py-2 px-3 text-right text-warning-400 font-mono">
                          {formatTorqueValue(result.threshold)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono ${
                            result.maxTorque > result.threshold
                              ? 'text-danger-400'
                              : 'text-success-400'
                          }`}
                        >
                          {((result.maxTorque / result.threshold - 1) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          {result.isOverLimit ? (
                            <span className="text-danger-400">超限</span>
                          ) : (
                            <span className="text-success-400">正常</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-primary-500/10 rounded-lg p-5 border border-primary-500/30">
              <h3 className="text-sm font-semibold text-white font-mono mb-4">
                💡 姿态筛选口径说明
              </h3>
              <div className="text-xs text-industrial-300 space-y-2">
                <p>
                  <span className="text-primary-400">1. 数据来源：</span>
                  本报告基于导入的关节角度数据和负载质量数据进行计算，数据来源信息已在合并页面记录。
                </p>
                <p>
                  <span className="text-primary-400">2. 计算方法：</span>
                  采用牛顿-欧拉递推算法计算各关节扭矩，考虑重力、惯性力和摩擦力影响。
                </p>
                <p>
                  <span className="text-primary-400">3. 阈值判定：</span>
                  扭矩阈值基于机器人型号额定参数，超过阈值的100%判定为超限，超过90%发出警告。
                </p>
                <p>
                  <span className="text-primary-400">4. 姿态筛选：</span>
                  所有时间点姿态均参与计算，未进行姿态过滤，确保结果完整性。
                </p>
                <p>
                  <span className="text-primary-400">5. 负载处理：</span>
                  连杆负载数据缺失时按0质量计算，会导致扭矩计算结果偏低，请优先修复负载缺失问题。
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-white font-mono mb-4">
                📋 改进建议
              </h3>
              <ul className="space-y-2">
                {report.summary.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-industrial-300">
                    <span className="text-primary-400 font-mono">{index + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-industrial-500 text-center text-xs text-industrial-500">
              <p>本报告由 ROBOT-TORQUE 机器人关节扭矩验算系统自动生成</p>
              <p className="mt-1">报告编号: {currentReport?.id || 'DEMO-REPORT'}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-industrial-400">
            <Copy className="w-3 h-3" />
            <span>截图时请完整包含上述内容，便于同事追溯验算口径</span>
          </div>
        </div>
      </div>
    </div>
  );
};
