import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Play, Trash2, Trophy, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { useHistoryStore } from '../store/gameStore';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, loadSessions, removeSession, clearHistory } = useHistoryStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResultIcon = (result: string) => {
    if (result === 'success') {
      return <Trophy className="w-5 h-5 text-green-400" />;
    }
    return <AlertTriangle className="w-5 h-5 text-red-400" />;
  };

  const getResultLabel = (result: string) => {
    return result === 'success' ? '成功' : '失败';
  };

  const getResultColor = (result: string) => {
    return result === 'success'
      ? 'bg-green-500/20 text-green-400'
      : 'bg-red-500/20 text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold text-white">历史记录</h1>
              <p className="text-xs text-slate-400">
                共 {sessions.length} 条记录
              </p>
            </div>
          </div>
          {sessions.length > 0 && (
            <button
              onClick={() => {
                if (confirm('确定要清空所有历史记录吗？')) {
                  clearHistory();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
              清空记录
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <History className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">暂无历史记录</h2>
            <p className="text-slate-400 mb-6">完成游戏后，记录会显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all"
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        session.result === 'success'
                          ? 'bg-green-500/20'
                          : 'bg-red-500/20'
                      }`}
                    >
                      {getResultIcon(session.result)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {session.levelName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDate(session.startTime)}
                        </span>
                        <span>
                          用时: {Math.round((session.endTime - session.startTime) / 1000)}秒
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">得分</div>
                      <div className="text-2xl font-bold text-amber-400">
                        {session.score}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">错误</div>
                      <div className="text-2xl font-bold text-red-400">
                        {session.totalErrors}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-500">步骤</div>
                      <div className="text-2xl font-bold text-white">
                        {session.steps.length}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(
                        session.result
                      )}`}
                    >
                      {getResultLabel(session.result)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/replay/${session.id}`)}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all"
                        title="查看回放"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => removeSession(session.id)}
                        className="p-2 bg-slate-700/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                        title="删除"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {session.steps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>参数快照:</span>
                      {Object.entries(session.steps[0]?.parameters || {}).map(
                        ([name, value]) => (
                          <span
                            key={name}
                            className="px-2 py-1 bg-slate-700/50 rounded text-xs font-mono"
                          >
                            {name} = {(value as number).toFixed(3)}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
