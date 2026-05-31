import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Download, ArrowLeft, CheckCircle, AlertTriangle, FileText, Home } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { copyReportToClipboard, downloadReport } from '@/utils/reportGenerator';
import type { FinalReport } from '@/utils/reportGenerator';
import { DIFFICULTY_LABELS, RISK_TYPE_COLORS } from '@/types';

export default function ReportPage() {
  const finalReport = useGameStore((state) => state.finalReport);
  const status = useGameStore((state) => state.status);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status !== 'finished' || !finalReport) {
      navigate('/');
    }
  }, [status, finalReport, navigate]);

  if (status !== 'finished' || !finalReport) return null;

  const report = finalReport as FinalReport;

  const handleCopy = async () => {
    const success = await copyReportToClipboard(report);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    downloadReport(report);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/settlement')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            返回结算页
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle size={18} className="text-success-400" />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={18} />
                  复制报告
                </>
              )}
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              下载报告
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-serif font-bold mb-2 flex items-center gap-3">
                  <FileText size={32} />
                  音乐版权拼案 - 结案报告
                </h1>
                <p className="text-white/70">
                  生成时间：{new Date().toLocaleString('zh-CN')}
                </p>
              </div>
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl font-serif font-bold"
                style={{
                  backgroundColor: `${report.summary.gradeColor}20`,
                  border: `4px solid ${report.summary.gradeColor}`,
                  color: report.summary.gradeColor,
                }}
              >
                {report.summary.grade}
              </div>
            </div>
          </div>

          <div className="p-8">
            <section className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4 flex items-center gap-2">
                📊 总体评价
              </h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-3 text-gray-600">综合评级</td>
                      <td className="py-3 text-right">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: report.summary.gradeColor }}
                        >
                          {report.summary.grade}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-600">最终得分</td>
                      <td className="py-3 text-right text-xl font-bold text-primary-600">
                        {Math.round(report.summary.score)} 分
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-600">难度</td>
                      <td className="py-3 text-right font-medium text-gray-800">
                        {DIFFICULTY_LABELS[report.summary.difficulty]}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-600">完成案件</td>
                      <td className="py-3 text-right font-medium text-gray-800">
                        {report.summary.completedCases} / {report.summary.totalCases}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-600">正确判定</td>
                      <td className="py-3 text-right font-medium text-gray-800">
                        {report.summary.correctVerdicts} / {report.summary.totalCases}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-gray-600">用时</td>
                      <td className="py-3 text-right font-medium text-gray-800">
                        {formatTime(report.summary.timeUsed)} / {formatTime(report.summary.totalTime)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4 flex items-center gap-2">
                📈 得分构成
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-success-50 border border-success-200 rounded-xl p-4">
                  <p className="text-success-700 text-sm mb-1">正确关联线索</p>
                  <p className="text-2xl font-bold text-success-600">+{report.scoreBreakdown.correctAssociation}</p>
                </div>
                <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
                  <p className="text-danger-700 text-sm mb-1">错误关联线索</p>
                  <p className="text-2xl font-bold text-danger-600">{report.scoreBreakdown.wrongAssociation}</p>
                </div>
                <div className="bg-success-50 border border-success-200 rounded-xl p-4">
                  <p className="text-success-700 text-sm mb-1">正确判定案件</p>
                  <p className="text-2xl font-bold text-success-600">+{report.scoreBreakdown.correctVerdict}</p>
                </div>
                <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
                  <p className="text-danger-700 text-sm mb-1">错误判定案件</p>
                  <p className="text-2xl font-bold text-danger-600">{report.scoreBreakdown.wrongVerdict}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-orange-700 text-sm mb-1">时间消耗扣分</p>
                  <p className="text-2xl font-bold text-orange-600">{report.scoreBreakdown.timePenalty}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-700 text-sm mb-1">提前完成奖励</p>
                  <p className="text-2xl font-bold text-blue-600">+{Math.round(report.scoreBreakdown.timeBonus)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-purple-700 text-sm mb-1">风险发现奖励</p>
                  <p className="text-2xl font-bold text-purple-600">+{report.scoreBreakdown.riskDiscovered}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-700 text-sm mb-1">未完成案件扣分</p>
                  <p className="text-2xl font-bold text-red-600">{report.scoreBreakdown.incompletePenalty}</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4 flex items-center gap-2">
                🎵 案件详情
              </h2>
              <div className="space-y-6">
                {report.caseReports.map((caseReport, index) => (
                  <motion.div
                    key={caseReport.caseId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    className={`border-2 rounded-xl p-6 ${
                      caseReport.isCorrect
                        ? 'border-success-300 bg-success-50/50'
                        : 'border-danger-300 bg-danger-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-serif font-bold text-gray-800 mb-2">
                          {index + 1}. {caseReport.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={caseReport.isCorrect ? 'text-success-600' : 'text-danger-600'}>
                            你的判定：{caseReport.userVerdict}
                          </span>
                          {!caseReport.isCorrect && (
                            <span className="text-gray-500">
                              (正确：{caseReport.correctVerdict})
                            </span>
                          )}
                          <span className={caseReport.isCorrect ? 'text-success-600' : 'text-danger-600'}>
                            {caseReport.isCorrect ? '✅ 判定正确' : '❌ 判定有误'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                      <p className="text-sm text-gray-500 mb-2">人话解释</p>
                      <p className="text-gray-800">{caseReport.humanExplanation}</p>
                    </div>

                    {caseReport.discoveredRisks.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-success-700 font-medium mb-2 flex items-center gap-1">
                          <CheckCircle size={14} />
                          ✅ 已发现的风险点
                        </p>
                        <div className="space-y-2">
                          {caseReport.discoveredRisks.map((risk) => (
                            <div
                              key={risk.id}
                              className="bg-success-50 border-l-4 border-success-500 rounded-r-lg p-4"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: RISK_TYPE_COLORS[risk.type as keyof typeof RISK_TYPE_COLORS] }}
                                />
                                <span className="font-medium text-success-800">{risk.title}</span>
                              </div>
                              <p className="text-sm text-success-700">{risk.humanDescription}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                触发材料：{risk.triggerClueTitle}
                              </p>
                              <p className="text-xs text-success-600 mt-1">
                                📌 下一步：{risk.nextStep}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {caseReport.missedRisks.length > 0 && (
                      <div>
                        <p className="text-sm text-danger-700 font-medium mb-2 flex items-center gap-1">
                          <AlertTriangle size={14} />
                          ⚠️ 遗漏的风险点
                        </p>
                        <div className="space-y-2">
                          {caseReport.missedRisks.map((risk) => (
                            <div
                              key={risk.id}
                              className="bg-danger-50 border-l-4 border-danger-500 rounded-r-lg p-4"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: RISK_TYPE_COLORS[risk.type as keyof typeof RISK_TYPE_COLORS] }}
                                />
                                <span className="font-medium text-danger-800">{risk.title}</span>
                              </div>
                              <p className="text-sm text-danger-700">{risk.humanDescription}</p>
                              <p className="text-xs text-danger-600 mt-1">
                                应该从「{risk.triggerClueTitle}」中发现
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⚠️ 风险识别分析
              </h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 text-gray-600 font-medium">风险类型</th>
                      <th className="text-center py-3 text-gray-600 font-medium">总数</th>
                      <th className="text-center py-3 text-gray-600 font-medium">已发现</th>
                      <th className="text-right py-3 text-gray-600 font-medium">识别率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.riskAnalysis.map((risk) => (
                      <tr key={risk.type}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: RISK_TYPE_COLORS[risk.type as keyof typeof RISK_TYPE_COLORS] }}
                            />
                            <span className="font-medium text-gray-800">{risk.label}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center text-gray-600">{risk.total}</td>
                        <td className="py-3 text-center text-gray-600">{risk.discovered}</td>
                        <td className="py-3 text-right">
                          <span
                            className={`font-bold ${
                              risk.discoveryRate >= 100
                                ? 'text-success-600'
                                : risk.discoveryRate >= 50
                                ? 'text-orange-600'
                                : 'text-danger-600'
                            }`}
                          >
                            {risk.discoveryRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-gray-800 mb-4 flex items-center gap-2">
                💡 改进建议
              </h2>
              <div className="space-y-3">
                {report.suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                    className="bg-primary-50 border-l-4 border-primary-500 rounded-r-lg p-4"
                  >
                    <p className="text-gray-700">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            <div className="border-t pt-6 text-center text-gray-400 text-sm">
              <p>此报告由「音乐版权拼案」游戏自动生成，用于培训和练习目的。</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 flex justify-center gap-4"
        >
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home size={18} />
            返回主页
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
