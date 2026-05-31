import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import html2canvas from 'html2canvas';
import {
  getRiskLevelText,
  getNodeTypeIcon,
  getRiskLevelColor,
  formatTimestamp,
  getFocusPointText,
  downloadTextFile,
  generateReportText,
  getDifficultyText,
  getDifficultyColor,
} from '../utils';
import type { RiskReport } from '../types';

export default function Report() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const loadLevel = useGameStore((s) => s.loadLevel);
  const generateReport = useGameStore((s) => s.generateReport);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (levelId) {
      loadLevel(levelId);
      setTimeout(() => {
        setReport(generateReport());
        setLoading(false);
      }, 100);
    }
  }, [levelId, loadLevel, generateReport]);

  const handleExportText = () => {
    if (report) {
      downloadTextFile(generateReportText(report), `风险分析报告_${report.levelId}.txt`);
    }
  };

  const handleExportImage = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `风险分析报告_${report?.levelId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  if (!report || !currentLevel) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">暂无报告数据</div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const SectionTitle = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
      <span className={`w-1 h-6 ${color} rounded`} />
      {children}
    </h2>
  );

  const StatCard = ({ bg, value, label }: { bg: string; value: number; label: string }) => (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            ← 返回
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleExportText}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
            >
              📄 导出文本
            </button>
            <button
              onClick={handleExportImage}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
            >
              🖼️ 导出图片
            </button>
          </div>
        </div>

        <motion.div
          ref={reportRef}
          variants={container}
          initial="hidden"
          animate="show"
          className="bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        >
          <motion.div
            variants={item}
            className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">风险分析报告</h1>
                <p className="text-white/80">报告编号：{report.levelId}</p>
                <p className="text-white/80">生成时间：{formatTimestamp(report.generateTime)}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(currentLevel.difficulty)} mb-2`}>
                  {getDifficultyText(currentLevel.difficulty)}
                </span>
                <p className="text-white/80">🎯 {getFocusPointText(currentLevel.focusPoint)}</p>
              </div>
            </div>
          </motion.div>

          <div className="p-8">
            <motion.div variants={item} className="mb-8">
              <SectionTitle color="bg-blue-600">基本信息统计</SectionTitle>
              <div className="grid grid-cols-4 gap-4">
                <StatCard bg="bg-slate-50 text-slate-900" value={report.totalNodes} label="总节点数" />
                <StatCard bg="bg-red-50 text-red-600" value={report.blacklistCount} label="黑名单" />
                <StatCard bg="bg-amber-50 text-amber-600" value={report.suspiciousCount} label="可疑" />
                <StatCard bg="bg-emerald-50 text-emerald-600" value={report.safeCount} label="安全" />
              </div>
              <div className="mt-4 bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">判断准确率</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(report.accuracyRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    style={{ width: `${report.accuracyRate * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>

            {report.falsePositives.length > 0 && (
              <motion.div variants={item} className="mb-8">
                <SectionTitle color="bg-red-600">误判/漏判详情</SectionTitle>
                <div className="space-y-4">
                  {report.falsePositives.map((item, i) => (
                    <div key={item.nodeId} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </span>
                        <span className="text-2xl">{getNodeTypeIcon(item.nodeType)}</span>
                        <span className="font-semibold text-lg">{item.nodeName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">你的标记</p>
                          <p className="font-medium" style={{ color: getRiskLevelColor(item.playerMark) }}>
                            {getRiskLevelText(item.playerMark)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">正确标记</p>
                          <p className="font-medium" style={{ color: getRiskLevelColor(item.correctMark) }}>
                            {getRiskLevelText(item.correctMark)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">
                        <span className="text-xs text-slate-500 block mb-1">原因分析</span>
                        {item.reason}
                      </p>
                      <p className="text-sm text-slate-700 bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <span className="text-xs text-slate-500 block mb-1">证据支持</span>
                        📌 {item.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {report.chainLengthIssues.length > 0 && (
              <motion.div variants={item} className="mb-8">
                <SectionTitle color="bg-amber-600">关系链过长问题分析</SectionTitle>
                <div className="space-y-4">
                  {report.chainLengthIssues.map((issue, i) => (
                    <div key={i} className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-600">🔗</span>
                        <span className="font-semibold">关系链（{issue.chainLength}度）</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-3 bg-white rounded-lg p-3 border border-amber-200">
                        {issue.chain.join(' → ')}
                      </p>
                      <p className="text-sm text-slate-700 mb-2">
                        <span className="font-medium">问题：</span>{issue.description}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">建议：</span>{issue.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {report.tagLagIssues.length > 0 && (
              <motion.div variants={item} className="mb-8">
                <SectionTitle color="bg-purple-600">标签滞后问题分析</SectionTitle>
                <div className="space-y-4">
                  {report.tagLagIssues.map((issue, i) => (
                    <div key={i} className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-purple-600">🏷️</span>
                        <span className="font-semibold">{issue.nodeName}</span>
                        <span className="text-xs text-slate-500 ml-auto">更新：{issue.timeDiff}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: getRiskLevelColor(issue.oldTag) + '20', color: getRiskLevelColor(issue.oldTag) }}>
                          {getRiskLevelText(issue.oldTag)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: getRiskLevelColor(issue.newTag) + '20', color: getRiskLevelColor(issue.newTag) }}>
                          {getRiskLevelText(issue.newTag)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">影响：</span>{issue.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {report.trainingPoints.length > 0 && (
              <motion.div variants={item}>
                <SectionTitle color="bg-emerald-600">培训要点总结</SectionTitle>
                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
                  <ul className="space-y-3">
                    {report.trainingPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
