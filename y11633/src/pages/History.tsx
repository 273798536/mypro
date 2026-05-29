import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Trophy,
  Clock,
  AlertTriangle,
  CheckCircle,
  Home,
  Download,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { getGameRecords } from '../store/gameStore';
import { formatTime } from '../utils/scoring';
import { LEVEL_CONFIGS } from '../data/levels';
import type { GameRecord } from '../types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<GameRecord[]>([]);

  useEffect(() => {
    const gameRecords = getGameRecords();
    setRecords(gameRecords);
  }, []);

  const exportAllToCSV = () => {
    const headers = ['日期', '难度', '得分', '完成订单', '总订单', '异常数', '用时(秒)'];
    const rows = records.map(r => [
      new Date(r.startTime).toLocaleString(),
      LEVEL_CONFIGS[r.level].name,
      r.totalScore,
      r.completedOrders,
      r.totalOrders,
      r.anomalies,
      r.duration.toFixed(1),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `游戏记录汇总_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const clearAllRecords = () => {
    if (confirm('确定要清除所有历史记录吗？此操作不可撤销。')) {
      localStorage.removeItem('warehouse_game_records');
      localStorage.removeItem('warehouse_game_replays');
      setRecords([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <History className="w-6 h-6 text-blue-400" />
                历史记录
              </h1>
              <p className="text-slate-400 text-sm">查看过往游戏成绩和回放</p>
            </div>
          </div>
          <div className="flex gap-2">
            {records.length > 0 && (
              <>
                <button
                  onClick={exportAllToCSV}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出全部
                </button>
                <button
                  onClick={clearAllRecords}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  清除记录
                </button>
              </>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-2xl">
            <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">暂无游戏记录</h2>
            <p className="text-slate-400 mb-6">完成一局游戏后，记录会显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
            >
              开始游戏
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map(record => {
              const config = LEVEL_CONFIGS[record.level];
              const completionRate =
                record.totalOrders > 0
                  ? Math.round((record.completedOrders / record.totalOrders) * 100)
                  : 0;

              return (
                <div
                  key={record.id}
                  className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                            record.level === 'easy'
                              ? 'bg-green-600'
                              : record.level === 'medium'
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                        >
                          {config.name}
                        </span>
                        <span className="text-slate-400 text-sm">
                          {new Date(record.startTime).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            总得分
                          </div>
                          <div className="text-2xl font-bold text-white">{record.totalScore}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            完成率
                          </div>
                          <div className="text-2xl font-bold text-green-400">{completionRate}%</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <Clock className="w-4 h-4 text-blue-400" />
                            用时
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {formatTime(record.duration)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            异常
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              record.anomalies === 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {record.anomalies}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/result/${record.id}`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        查看详情
                      </button>
                      <button
                        onClick={() => navigate(`/replay/${record.id}`)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        回放
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
