import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Trash2, FileText, Trophy, Target, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import type { HistoryRecord } from '@/types';
import { DIFFICULTY_LABELS } from '@/types';
import { getHistoryList, clearHistory } from '@/utils/storage';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const records = getHistoryList();
    setHistory(records);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setShowConfirm(false);
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/report/${reportId}`);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400';
      case 'normal':
        return 'bg-blue-500/20 text-blue-400';
      case 'hard':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">历史记录</h1>
            <p className="mt-1 text-slate-400">查看过往游戏记录和审计报告</p>
          </div>
          <div className="flex gap-3">
            {history.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <Trash2 size={18} />
                清空记录
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              <Home size={18} />
              返回首页
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50 py-20">
            <FileText size={64} className="mb-4 text-slate-600" />
            <h3 className="mb-2 text-xl font-semibold text-slate-300">暂无历史记录</h3>
            <p className="mb-6 text-slate-500">完成游戏后，记录将显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div
                key={record.id}
                onClick={() => handleViewReport(record.reportId)}
                className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800/50 p-5 transition-all hover:border-slate-600 hover:bg-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">
                      {record.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white">{new Date(record.date).toLocaleString()}</h3>
                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${getDifficultyColor(record.difficulty)}`}>
                          {DIFFICULTY_LABELS[record.difficulty]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Target size={14} className="text-blue-400" />
                          正确率 {record.accuracy}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-green-400" />
                          {formatDuration(record.duration)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">确认清空</h3>
                <p className="text-sm text-slate-400">此操作不可恢复</p>
              </div>
            </div>
            <p className="mb-6 text-slate-300">
              确定要清空所有历史记录吗？所有游戏记录和报告都将被永久删除。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-slate-600 bg-slate-700 px-4 py-3 font-medium text-slate-300 transition-colors hover:bg-slate-600"
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white transition-colors hover:bg-red-600"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
