import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Target, Clock, Zap, Home, RotateCcw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { GameReport, PlayerAction, Card } from '@/types';
import { DIFFICULTY_LABELS, ERROR_TYPE_LABELS, MATERIAL_TYPE_LABELS, SECURITY_LEVEL_LABELS, RETENTION_PERIOD_LABELS, CARD_SOURCE_LABELS } from '@/types';
import { getReport } from '@/utils/storage';
import { ExportButton } from '@/components/ExportButton';
import { getGrade } from '@/utils/scoreSystem';

export const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<GameReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const reportData = getReport(id);
      setReport(reportData);
      setLoading(false);
    }
  }, [id]);

  const handlePlayAgain = () => {
    navigate('/');
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-xl text-white">加载中...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900">
        <div className="mb-4 text-xl text-white">报告不存在</div>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500"
        >
          返回首页
        </button>
      </div>
    );
  }

  const duration = Math.round((report.endTime - report.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const grade = getGrade(report.accuracy);

  const gradeColors: Record<string, string> = {
    S: 'from-yellow-400 to-amber-500',
    A: 'from-green-400 to-emerald-500',
    B: 'from-blue-400 to-indigo-500',
    C: 'from-orange-400 to-amber-500',
    D: 'from-red-400 to-rose-500',
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white">归档审计报告</h1>
          <div className="flex items-center gap-4 text-slate-400">
            <span>难度：{DIFFICULTY_LABELS[report.difficulty]}</span>
            <span>•</span>
            <span>{new Date(report.startTime).toLocaleString()}</span>
          </div>
        </div>

        <div className="mb-8 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-2xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-6">
              <div className={`flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${gradeColors[grade]} text-5xl font-bold text-white shadow-2xl`}>
                {grade}
              </div>
              <div>
                <div className="text-5xl font-bold text-white">{report.totalScore}</div>
                <div className="text-lg text-slate-400">总分</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                  <Target size={24} className="text-blue-400" />
                  {report.accuracy}%
                </div>
                <div className="text-sm text-slate-400">正确率</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                  <Clock size={24} className="text-green-400" />
                  {minutes}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="text-sm text-slate-400">用时</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                  <CheckCircle size={24} className="text-emerald-400" />
                  {report.correctCount}
                </div>
                <div className="text-sm text-slate-400">正确</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
                  <Zap size={24} className="text-yellow-400" />
                  {report.maxCombo}
                </div>
                <div className="text-sm text-slate-400">最高连击</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">错误分析</h3>
            <div className="space-y-3">
              {Object.entries(report.errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <XCircle size={16} className="text-red-400" />
                    {ERROR_TYPE_LABELS[type as keyof typeof ERROR_TYPE_LABELS]}
                  </div>
                  <div className="font-semibold text-red-400">{count} 次</div>
                </div>
              ))}
              {Object.values(report.errorsByType).every(v => v === 0) && (
                <div className="text-center text-slate-500">太棒了，没有错误！</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">改进建议</h3>
            <div className="space-y-2 text-slate-300">
              {report.errorsByType.classification > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
                  <span>材料分类判断需要加强，注意合同、发票、保密材料的特征区别</span>
                </div>
              )}
              {report.errorsByType.security_level > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
                  <span>保密级别判断需要加强，不同材料类型对应不同的密级范围</span>
                </div>
              )}
              {report.errorsByType.retention_period > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
                  <span>保管期限计算需要加强，熟记各类材料的保管期限规定</span>
                </div>
              )}
              {report.errorsByType.borrow_not_registered > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-400" />
                  <span>注意检查借阅请求，有借阅记录的材料必须登记</span>
                </div>
              )}
              {Object.values(report.errorsByType).every(v => v === 0) && (
                <div className="text-center text-emerald-400">🎉 表现优秀！继续保持！</div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">操作明细</h3>
            <ExportButton report={report} />
          </div>
          <div className="space-y-4">
            {report.actions.map((action: PlayerAction, index: number) => {
              const card = report.cards.find((c: Card) => c.id === action.cardId);
              if (!card) return null;
              const isCorrect = action.errors.length === 0;

              return (
                <div
                  key={action.cardId + index}
                  className={`rounded-xl border-2 p-5 ${isCorrect ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                        {isCorrect ? (
                          <CheckCircle size={20} className="text-white" />
                        ) : (
                          <XCircle size={20} className="text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          第 {index + 1} 张 - {card.title}
                        </div>
                        <div className="text-sm text-slate-400">
                          {CARD_SOURCE_LABELS[card.source]}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${action.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {action.scoreChange >= 0 ? '+' : ''}{action.scoreChange}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg bg-slate-800 p-3">
                      <div className="mb-1 text-xs text-slate-500">你的选择</div>
                      <div className="text-slate-300">
                        分类：{MATERIAL_TYPE_LABELS[action.selectedType]}
                        <br />
                        保密：{SECURITY_LEVEL_LABELS[action.selectedSecurityLevel]}
                        <br />
                        期限：{RETENTION_PERIOD_LABELS[action.selectedRetentionPeriod]}
                        <br />
                        借阅：{action.isBorrowRegistered ? '已登记' : '未登记'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-800 p-3">
                      <div className="mb-1 text-xs text-slate-500">正确答案</div>
                      <div className="text-slate-300">
                        分类：{MATERIAL_TYPE_LABELS[card.materialType]}
                        <br />
                        保密：{SECURITY_LEVEL_LABELS[card.correctSecurityLevel]}
                        <br />
                        期限：{RETENTION_PERIOD_LABELS[card.correctRetentionPeriod]}
                        <br />
                        借阅：{card.hasBorrowRequest ? '需要登记' : '不需要'}
                      </div>
                    </div>
                  </div>

                  {!isCorrect && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {action.errors.map((error) => (
                        <span key={error} className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                          {ERROR_TYPE_LABELS[error as keyof typeof ERROR_TYPE_LABELS]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={handlePlayAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
          >
            <RotateCcw size={20} />
            再来一局
          </button>
          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-6 py-4 font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            <Home size={20} />
            历史记录
          </button>
        </div>
      </div>
    </div>
  );
};
