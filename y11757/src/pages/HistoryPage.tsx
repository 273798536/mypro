import { useState, useMemo } from 'react';
import { ArrowLeft, Trash2, Download, Star, Clock, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadGameRecords, deleteRecord, clearAllRecords } from '../game/recorder';
import { exportAllRecordsAsCSV, exportAsText, exportAsJSON } from '../utils/export';
import { FAIL_REASON_MESSAGES, DIFFICULTY_COLORS } from '../game/config';
import { formatTime } from '../utils/math';
import type { GameRecord } from '../game/types';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const records = useMemo(() => loadGameRecords(), []);

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records;
    if (filter === 'success') return records.filter((r) => r.success);
    return records.filter((r) => !r.success);
  }, [records, filter]);

  const getDifficulty = (levelId: number) => {
    if (levelId <= 2) return 'easy';
    if (levelId <= 5) return 'medium';
    return 'hard';
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这条记录吗？')) {
      deleteRecord(id);
      window.location.reload();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清除所有记录吗？此操作不可恢复！')) {
      clearAllRecords();
      window.location.reload();
    }
  };

  const handleExportReport = (e: React.MouseEvent, record: GameRecord) => {
    e.stopPropagation();
    exportAsText(record);
  };

  const handleExportJSON = (e: React.MouseEvent, record: GameRecord) => {
    e.stopPropagation();
    exportAsJSON(record);
  };

  const successCount = records.filter((r) => r.success).length;
  const totalScore = records.reduce((sum, r) => sum + r.score, 0);
  const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0;

  return (
    <div className="min-h-screen grid-bg noise-overlay relative">
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            ← 返回
          </button>
          <h1 className="text-3xl font-display font-bold text-neon-cyan glow-text-cyan">
            📊 历史记录
          </h1>
          <div className="w-32" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="panel-glass p-4 text-center">
            <div className="text-3xl font-display font-bold text-neon-cyan">
              {records.length}
            </div>
            <div className="text-xs text-gray-400 font-mono">总记录数</div>
          </div>
          <div className="panel-glass p-4 text-center">
            <div className="text-3xl font-display font-bold text-success-green">
              {successCount}
            </div>
            <div className="text-xs text-gray-400 font-mono">成功次数</div>
          </div>
          <div className="panel-glass p-4 text-center">
            <div className="text-3xl font-display font-bold text-neon-yellow">
              {records.length > 0 ? Math.round((successCount / records.length) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-400 font-mono">成功率</div>
          </div>
          <div className="panel-glass p-4 text-center">
            <div className="text-3xl font-display font-bold text-neon-purple">
              {avgScore}
            </div>
            <div className="text-xs text-gray-400 font-mono">平均得分</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'success', 'failed'] as const).map((f) => (
              <button
                key={f}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-all duration-300 ${
                  filter === f
                    ? 'bg-neon-cyan text-space-900'
                    : 'border border-gray-600 text-gray-400 hover:border-gray-400'
                }`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? '全部' : f === 'success' ? '成功' : '失败'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-neon-purple text-sm"
              onClick={exportAllRecordsAsCSV}
              disabled={records.length === 0}
            >
              <Download className="w-4 h-4 inline mr-1" />
              导出全部 CSV
            </button>
            <button
              className="btn-neon-pink text-sm"
              onClick={handleClearAll}
              disabled={records.length === 0}
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              清除全部
            </button>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="panel-glass p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-display font-bold text-gray-400 mb-2">
              暂无记录
            </h3>
            <p className="text-gray-500 font-mono">完成游戏后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              const isExpanded = expandedId === record.id;
              const difficulty = getDifficulty(record.levelId);
              const difficultyColor = DIFFICULTY_COLORS[difficulty];

              return (
                <div
                  key={record.id}
                  className="panel-glass p-4 transition-all duration-300 hover:border-neon-cyan/50"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                          record.success
                            ? 'bg-success-green/20'
                            : 'bg-neon-pink/20'
                        }`}
                      >
                        {record.success ? '✓' : '✗'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-white">
                            {record.levelName}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              color: difficultyColor,
                              backgroundColor: `${difficultyColor}20`,
                            }}
                          >
                            {difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-display font-bold text-neon-yellow">
                          {record.score}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">得分</div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i <= record.stars
                                ? 'text-neon-yellow fill-neon-yellow'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-mono text-neon-cyan">
                          {formatTime(record.duration)}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">用时</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-space-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-1">
                            <Zap className="w-3 h-3" />
                            电荷数量
                          </div>
                          <div className="text-lg font-display font-bold text-neon-pink">
                            {record.chargesPlaced}
                          </div>
                        </div>
                        <div className="bg-space-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-1">
                            <Clock className="w-3 h-3" />
                            能量消耗
                          </div>
                          <div className="text-lg font-display font-bold text-neon-yellow">
                            {Math.round(record.energyUsed)}
                          </div>
                        </div>
                        <div className="bg-space-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-1">
                            <Zap className="w-3 h-3" />
                            最大电场
                          </div>
                          <div className="text-lg font-display font-bold text-neon-cyan">
                            {Math.round(record.maxFieldStrength)}
                          </div>
                        </div>
                        <div className="bg-space-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 font-mono mb-1">
                            <Star className="w-3 h-3" />
                            星级
                          </div>
                          <div className="text-lg font-display font-bold text-neon-purple">
                            {record.stars} / 3
                          </div>
                        </div>
                      </div>

                      {!record.success && record.failReason && (
                        <div className="mb-4 p-3 bg-neon-pink/10 border border-neon-pink/30 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-neon-pink" />
                          <span className="text-neon-pink font-mono text-sm">
                            失败原因: {FAIL_REASON_MESSAGES[record.failReason]}
                          </span>
                        </div>
                      )}

                      {record.charges.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 font-mono mb-2">
                            电荷配置
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {record.charges.map((charge, idx) => (
                              <div
                                key={idx}
                                className={`px-3 py-1 rounded-lg text-xs font-mono ${
                                  charge.magnitude > 0
                                    ? 'bg-neon-pink/20 text-neon-pink'
                                    : 'bg-neon-cyan/20 text-neon-cyan'
                                }`}
                              >
                                {charge.magnitude > 0 ? '+' : '−'} 强度:{charge.strength}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          className="btn-neon text-sm"
                          onClick={(e) => handleExportReport(e, record)}
                        >
                          导出报告
                        </button>
                        <button
                          className="btn-neon-purple text-sm"
                          onClick={(e) => handleExportJSON(e, record)}
                        >
                          导出 JSON
                        </button>
                        <button
                          className="btn-neon-pink text-sm ml-auto"
                          onClick={(e) => handleDelete(e, record.id)}
                        >
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
