import { useMemo, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, Trophy, Target, Clock, XCircle, Trash2, Eye } from 'lucide-react';
import type { GameRecord } from '../types';
import { generateReportData, downloadReport } from '../utils/export';

interface HistoryPageProps {
  onNavigate: (page: 'start' | 'result') => void;
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const { gameHistory, loadGameHistory } = useGameStore();
  const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null);

  const sortedHistory = useMemo(() => {
    return [...gameHistory].sort((a, b) => b.endTime - a.endTime);
  }, [gameHistory]);

  const formatTime = (ms: number): string => {
    const seconds = Math.round(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getAccuracy = (record: GameRecord): number => {
    if (record.totalJudgements === 0) return 0;
    return Math.round((record.correctJudgements / record.totalJudgements) * 100);
  };

  const handleViewRecord = (record: GameRecord) => {
    setSelectedRecord(record);
  };

  const handleExportRecord = (record: GameRecord) => {
    const report = generateReportData(record);
    downloadReport(report, 'json');
  };

  const handleClearHistory = () => {
    if (confirm('确定要清除所有历史记录吗？此操作不可撤销。')) {
      localStorage.removeItem('math_climbing_history');
      loadGameHistory();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onNavigate('start')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回主页
          </Button>
          <h1 className="text-2xl font-bold text-white">历史记录</h1>
          {gameHistory.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearHistory}>
              <Trash2 className="w-4 h-4 mr-2" />
              清除记录
            </Button>
          )}
        </div>

        {selectedRecord ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>游戏详情</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>
                  返回列表
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-xl font-bold text-white">{selectedRecord.totalScore}</div>
                    <div className="text-sm text-slate-400">总得分</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-xl font-bold text-white">{getAccuracy(selectedRecord)}%</div>
                    <div className="text-sm text-slate-400">正确率</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <div className="text-xl font-bold text-white">
                      {formatTime(selectedRecord.endTime - selectedRecord.startTime)}
                    </div>
                    <div className="text-sm text-slate-400">游戏时长</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                    <div className="text-xl font-bold text-white">{selectedRecord.errors.length}</div>
                    <div className="text-sm text-slate-400">错误次数</div>
                  </div>
                </div>

                <div className="text-sm text-slate-400">
                  <p>游戏时间: {formatDate(selectedRecord.startTime)}</p>
                  <p>完成关卡: {selectedRecord.levelsCompleted}</p>
                  <p>判断次数: {selectedRecord.correctJudgements}/{selectedRecord.totalJudgements}</p>
                </div>

                {selectedRecord.errors.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">错误记录</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedRecord.errors.map((error, idx) => (
                        <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-white">{error.source}</p>
                              <p className="text-xs text-slate-400">{error.reason}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              error.correctionStatus === 'corrected'
                                ? 'bg-green-500/20 text-green-400'
                                : error.correctionStatus === 'needs_manual_review'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {error.correctionStatus === 'corrected' ? '已修正' : error.correctionStatus === 'needs_manual_review' ? '需确认' : '未处理'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleExportRecord(selectedRecord)}
                >
                  导出此报告
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {sortedHistory.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-medium text-white mb-2">暂无游戏记录</h3>
                  <p className="text-slate-400 mb-4">完成一局游戏后，记录将显示在这里</p>
                  <Button onClick={() => onNavigate('start')}>
                    开始游戏
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedHistory.map((record, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              得分: {record.totalScore} · 正确率: {getAccuracy(record)}%
                            </p>
                            <p className="text-sm text-slate-400">
                              {formatDate(record.endTime)} · {formatTime(record.endTime - record.startTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-sm text-slate-300">
                              关卡 {record.levelsCompleted}
                            </p>
                            <p className="text-xs text-slate-500">
                              {record.errors.length} 个错误
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRecord(record)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
