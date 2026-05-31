
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, History, Trash2 } from 'lucide-react';
import { GameSession } from '../types';
import { getSessions, deleteSession, clearAllSessions } from '../utils/storage';
import { SessionCard } from '../components/history/SessionCard';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [filter, setFilter] = useState<'all' | 'S' | 'A' | 'B' | 'C' | 'D'>('all');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    const data = getSessions();
    setSessions(data);
  };

  const handleViewResult = (id: string) => {
    navigate(`/result/${id}`);
  };

  const handleReplay = (id: string) => {
    navigate(`/replay/${id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteSession(id);
      loadSessions();
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
      clearAllSessions();
      loadSessions();
    }
  };

  const filteredSessions =
    filter === 'all'
      ? sessions
      : sessions.filter((s) => s.grade === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>返回首页</span>
          </button>
          {sessions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              清空记录
            </button>
          )}
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-400/20 to-blue-600/20 mb-4">
            <History className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">历史记录</h1>
          <p className="text-white/60">查看和管理所有训练记录</p>
        </div>

        {sessions.length > 0 && (
          <div className="flex justify-center gap-2 mb-8">
            {(['all', 'S', 'A', 'B', 'C', 'D'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {f === 'all' ? '全部' : f}
              </button>
            ))}
          </div>
        )}

        {filteredSessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-4">
              <History className="w-10 h-10 text-white/30" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'all' ? '暂无训练记录' : `没有评级为 ${filter} 的记录`}
            </h3>
            <p className="text-white/50 mb-6">开始训练后，记录将显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl transition-all"
            >
              开始训练
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onViewResult={handleViewResult}
                onReplay={handleReplay}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

