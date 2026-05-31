import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Trash2, Search, Calendar, User, Trophy, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadGameHistory, deleteGameRecord, clearGameHistory } from '../utils/storage';
import { GameRecord } from '../types/game';

const History: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setRecords(loadGameHistory());
  }, []);

  const filteredRecords = records.filter(
    (r) =>
      r.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sceneName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteGameRecord(id);
    setRecords(loadGameHistory());
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      clearGameHistory();
      setRecords([]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatDuration = (start: number, end: number) => {
    const seconds = Math.floor((end - start) / 1000);
    return `${seconds} 秒`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">历史记录</h1>
              <p className="text-xs text-slate-400">查看和分析过往游戏</p>
            </div>
          </div>
          {records.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              清空记录
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索玩家名称或场景..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">暂无历史记录</h3>
            <p className="text-slate-400 mb-6">完成游戏后，记录将显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords
              .sort((a, b) => b.endTime - a.endTime)
              .map((record) => (
                <div
                  key={record.id}
                  className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                          record.result.isWin
                            ? 'bg-green-500/20'
                            : 'bg-red-500/20'
                        }`}
                      >
                        {record.result.isWin ? (
                          <Trophy className="w-7 h-7 text-green-500" />
                        ) : (
                          <XCircle className="w-7 h-7 text-red-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{record.sceneName}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {record.playerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(record.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-orange-500">
                        {record.result.finalScore}
                      </div>
                      <div className="text-xs text-slate-500">
                        用时 {formatDuration(record.startTime, record.endTime)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">完成订单</div>
                      <div className="text-xl font-bold text-green-400">
                        {record.result.scoreBreakdown.completedOrders}
                      </div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">超时订单</div>
                      <div className="text-xl font-bold text-red-400">
                        {record.result.scoreBreakdown.timeoutOrders}
                      </div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">寻路次数</div>
                      <div className="text-xl font-bold text-blue-400">
                        {record.result.pathFindingTriggers.length}
                      </div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">暂停惩罚</div>
                      <div className="text-xl font-bold text-yellow-400">
                        -{record.result.scoreBreakdown.pausePenalty}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="text-sm text-slate-400">
                      {record.result.reason}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/replay/${record.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors text-sm font-semibold"
                      >
                        <Play className="w-4 h-4" />
                        回放分析
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
