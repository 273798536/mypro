import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Home, 
  RotateCcw,
  FileText,
  Download,
  Clock,
  Pill,
  Scale,
  Shield,
  Calendar,
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';
import { ErrorType, PlayerAction } from '../types';

const errorTypeLabels: Record<ErrorType, { label: string; color: string }> = {
  WRONG_DRUG: { label: '药品选择错误', color: 'text-red-400' },
  UNIT_MISMATCH: { label: '剂量单位错误', color: 'text-orange-400' },
  CONTRAINDICATION: { label: '禁忌识别错误', color: 'text-yellow-400' },
  BATCH_EXPIRED: { label: '批号已过期', color: 'text-red-500' },
  BATCH_WRONG: { label: '批号选择错误', color: 'text-orange-500' },
  CALCULATION_ERROR: { label: '剂量计算错误', color: 'text-orange-400' }
};

const actionTypeLabels: Record<string, string> = {
  drug_select: '药品选择',
  unit_confirm: '单位确认',
  contra_check: '禁忌检查',
  batch_confirm: '批号核对'
};

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { history, currentSession } = useGameStore();
  const [expandedSections, setExpandedSections] = useState<string[]>(['errors', 'details']);

  const session = useMemo(() => {
    if (currentSession?.id === sessionId) return currentSession;
    return history.find(h => h.id === sessionId);
  }, [sessionId, currentSession, history]);

  const sessionWithDetails = session as (typeof session) & {
    endTime?: number;
    actions: PlayerAction[];
    errors: PlayerAction[];
  };

  const level = useMemo(() => {
    if (!session) return null;
    return getLevelById(session.levelId);
  }, [session]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getScoreGrade = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return { grade: 'A', color: 'text-green-400', label: '优秀' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-400', label: '良好' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-400', label: '合格' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-400', label: '待提升' };
    return { grade: 'F', color: 'text-red-400', label: '不合格' };
  };

  const exportReport = () => {
    if (!session || !level) return;

    const reportContent = `
药房配药校验赛 - 结算报告
========================================

基本信息
--------
关卡名称: ${level.name}
难度等级: ${level.difficulty}
开始时间: ${new Date(session.startTime).toLocaleString('zh-CN')}
结束时间: ${sessionWithDetails.endTime ? new Date(sessionWithDetails.endTime).toLocaleString('zh-CN') : 'N/A'}
用时: ${sessionWithDetails.endTime ? Math.floor((sessionWithDetails.endTime - session.startTime) / 1000) : 0}秒

得分统计
--------
总分: ${session.totalScore} / ${session.maxScore}
评级: ${getScoreGrade(session.totalScore, session.maxScore).label}
错误数: ${sessionWithDetails.errors.length}

错误详情
--------
${sessionWithDetails.errors.map((error: PlayerAction, index: number) => `
${index + 1}. ${errorTypeLabels[error.errorType!]?.label || error.errorType}
   步骤: ${error.step + 1}
   来源行号: 处方第${error.sourceLine}行
   详情: ${error.errorDetail}
   时间: ${new Date(error.timestamp).toLocaleTimeString('zh-CN')}
`).join('')}

详细操作记录
--------
${sessionWithDetails.actions.map((action: PlayerAction, index: number) => `
${index + 1}. 步骤${action.step + 1} - ${actionTypeLabels[action.type]}
   选择: ${action.selectedId}
   结果: ${action.isCorrect ? '正确' : '错误'}
   得分: ${action.pointsDelta > 0 ? '+' : ''}${action.pointsDelta}
   来源: 处方第${action.sourceLine}行
   时间: ${new Date(action.timestamp).toLocaleTimeString('zh-CN')}
`).join('')}

========================================
报告生成时间: ${new Date().toLocaleString('zh-CN')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `配药报告_${session.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!session || !level) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-alert-warning" />
          <p className="text-xl">找不到该对局记录</p>
          <button onClick={() => navigate('/')} className="mt-4 btn-primary">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const scoreGrade = getScoreGrade(session.totalScore, session.maxScore);
  const duration = sessionWithDetails.endTime ? Math.floor((sessionWithDetails.endTime - session.startTime) / 1000) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg to-dark-card text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card rounded-lg hover:bg-dark-border transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={exportReport}
              className="flex items-center gap-2 px-4 py-2 bg-medical-primary rounded-lg hover:bg-medical-dark transition-colors"
            >
              <Download className="w-5 h-5" />
              导出报告
            </button>
            <button
              onClick={() => navigate(`/game/${level.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-card rounded-lg hover:bg-dark-border transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              再玩一次
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-dark-card rounded-2xl p-8 mb-8"
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                scoreGrade.grade === 'A' || scoreGrade.grade === 'B' 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : scoreGrade.grade === 'C' || scoreGrade.grade === 'D'
                    ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                    : 'bg-gradient-to-br from-red-500 to-rose-600'
              }`}>
                <span className="text-4xl font-bold text-white">{scoreGrade.grade}</span>
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold mb-1">{level.name}</h1>
                <p className="text-gray-400">{level.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span className="text-5xl font-bold">{session.totalScore}</span>
              <span className="text-2xl text-gray-400">/ {session.maxScore}</span>
            </div>
            <p className={`mt-2 text-lg ${scoreGrade.color}`}>
              评级: {scoreGrade.label}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-dark-bg/50 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{duration}</p>
              <p className="text-sm text-gray-400">用时(秒)</p>
            </div>
            <div className="bg-dark-bg/50 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold">{sessionWithDetails.actions.length - sessionWithDetails.errors.length}</p>
              <p className="text-sm text-gray-400">正确操作</p>
            </div>
            <div className="bg-dark-bg/50 rounded-xl p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <p className="text-2xl font-bold">{sessionWithDetails.errors.length}</p>
              <p className="text-sm text-gray-400">错误次数</p>
            </div>
          </div>

          {session.status === 'timeout' && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-xl text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-yellow-500">提示：时间耗尽，部分步骤未完成</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-card rounded-2xl p-6 mb-6"
        >
          <button
            onClick={() => toggleSection('errors')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              错误清单
              {sessionWithDetails.errors.length > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                  {sessionWithDetails.errors.length}
                </span>
              )}
            </h2>
            {expandedSections.includes('errors') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('errors') && (
            <div className="mt-6 space-y-4">
              {sessionWithDetails.errors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p className="text-gray-400">没有错误，干得漂亮！</p>
                </div>
              ) : (
                sessionWithDetails.errors.map((error, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-dark-bg/50 rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        error.errorType === 'CONTRAINDICATION' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                      }`}>
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`font-medium ${errorTypeLabels[error.errorType!]?.color || 'text-red-400'}`}>
                            {errorTypeLabels[error.errorType!]?.label || error.errorType}
                          </span>
                          <span className="text-sm text-gray-400">
                            步骤 {error.step + 1} · {actionTypeLabels[error.type]}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-2">{error.errorDetail}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            来源: 处方第{error.sourceLine}行
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(error.timestamp).toLocaleTimeString('zh-CN')}
                          </span>
                          {error.correctionMade && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <RotateCcw className="w-4 h-4" />
                              已修正
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-red-400 font-bold">
                        {error.pointsDelta}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-card rounded-2xl p-6 mb-6"
        >
          <button
            onClick={() => toggleSection('details')}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-400" />
              详细操作记录
              <span className="bg-gray-500 text-white text-sm px-2 py-0.5 rounded-full">
                {sessionWithDetails.actions.length}
              </span>
            </h2>
            {expandedSections.includes('details') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedSections.includes('details') && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-3 px-2">#</th>
                    <th className="text-left py-3 px-2">步骤</th>
                    <th className="text-left py-3 px-2">操作类型</th>
                    <th className="text-left py-3 px-2">选择内容</th>
                    <th className="text-left py-3 px-2">结果</th>
                    <th className="text-left py-3 px-2">来源</th>
                    <th className="text-right py-3 px-2">得分</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionWithDetails.actions.map((action, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-700/50 ${
                        !action.isCorrect ? 'bg-red-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-2 text-gray-400">{index + 1}</td>
                      <td className="py-3 px-2">第{action.step + 1}步</td>
                      <td className="py-3 px-2">
                        <span className="flex items-center gap-1">
                          {action.type === 'drug_select' && <Pill className="w-4 h-4 text-green-400" />}
                          {action.type === 'unit_confirm' && <Scale className="w-4 h-4 text-blue-400" />}
                          {action.type === 'contra_check' && <Shield className="w-4 h-4 text-yellow-400" />}
                          {action.type === 'batch_confirm' && <Calendar className="w-4 h-4 text-purple-400" />}
                          {actionTypeLabels[action.type]}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono text-gray-400 truncate max-w-[150px]">
                        {action.selectedId}
                      </td>
                      <td className="py-3 px-2">
                        {action.isCorrect ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            正确
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="w-4 h-4" />
                            错误
                          </span>
                        )}
                        {action.correctionMade && (
                          <span className="ml-1 text-xs text-yellow-400">(修正)</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-400">
                        处方第{action.sourceLine}行
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${
                        action.pointsDelta >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {action.pointsDelta >= 0 ? '+' : ''}{action.pointsDelta}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-600">
                    <td colSpan={6} className="py-3 px-2 text-right font-medium">
                      总分
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-lg">
                      {session.totalScore}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-card rounded-2xl p-6"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
            <Pill className="w-6 h-6 text-medical-light" />
            处方核对情况
          </h2>

          <div className="space-y-4">
            {level.prescriptions.map((prescription, index) => {
              const stepActions = sessionWithDetails.actions.filter(a => a.step === index);
              const hasError = stepActions.some(a => !a.isCorrect);
              
              return (
                <div 
                  key={prescription.id}
                  className={`p-4 rounded-xl border ${
                    hasError 
                      ? 'border-red-500/50 bg-red-500/5' 
                      : 'border-green-500/50 bg-green-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">第{prescription.lineNumber}行</span>
                        <h3 className="font-medium">{prescription.drugName}</h3>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        剂量: {prescription.dosage} | 用法: {prescription.frequency} {prescription.route}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasError ? (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                          有错误
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          正确
                        </span>
                      )}
                    </div>
                  </div>

                  {stepActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <p className="text-xs text-gray-500 mb-2">操作记录:</p>
                      <div className="flex flex-wrap gap-2">
                        {stepActions.map((action, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs ${
                              action.isCorrect 
                                ? 'bg-green-500/10 text-green-400' 
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {actionTypeLabels[action.type]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
