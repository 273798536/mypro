import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Play, FileText, Trophy, Clock, Users, AlertTriangle } from 'lucide-react';
import { calculateScoreDetails } from '@/engine/gameEngine';
import type { ScoreDetail, ActionLog, Passenger } from '@/types/game';

interface GameResult {
  score: number;
  passengers: { id: string; status: string; waitTime: number }[];
  actionLogs: ActionLog[];
  timestamp: number;
}

export function ReportPage() {
  const navigate = useNavigate();
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lastGameResult');
    if (saved) {
      try {
        setGameResult(JSON.parse(saved));
      } catch {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

  const scoreDetails = useMemo<ScoreDetail[]>(() => {
    if (!gameResult) return [];
    
    const mockPassengers: Passenger[] = gameResult.passengers.map(p => ({
      id: p.id,
      x: 0,
      y: 0,
      targetExit: '',
      waitTime: p.waitTime,
      status: p.status as 'moving' | 'waiting' | 'exited' | 'stuck',
      speed: 0,
      path: [],
      color: '',
    }));
    
    const timeRemaining = Math.max(0, 180 - Math.floor(gameResult.timestamp / 1000));
    
    return calculateScoreDetails(mockPassengers, timeRemaining, gameResult.actionLogs);
  }, [gameResult]);

  const totalScore = useMemo(() => {
    return scoreDetails.reduce((sum, detail) => sum + detail.score, 0);
  }, [scoreDetails]);

  const maxScore = useMemo(() => {
    return scoreDetails.reduce((sum, detail) => sum + detail.maxScore, 0);
  }, [scoreDetails]);

  const failureReasons = useMemo(() => {
    if (!gameResult) return [];
    return gameResult.actionLogs.filter(log => log.result === 'error' || log.result === 'warning');
  }, [gameResult]);

  useEffect(() => {
    if (!isPlaying || !gameResult) return;

    const interval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= gameResult.actionLogs.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, gameResult]);

  const handleExport = () => {
    if (!gameResult) return;

    const exportData = {
      exportTime: new Date().toISOString(),
      gameResult: {
        ...gameResult,
        scoreDetails,
        totalScore,
        maxScore,
        scorePercentage: Math.round((totalScore / maxScore) * 100),
        failureReasons: failureReasons.map(r => ({
          lineNumber: r.lineNumber,
          source: r.source,
          action: r.action,
          time: r.time,
          result: r.result,
          details: r.details,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `处置报告_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!gameResult) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回游戏
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            处置报告
          </h1>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-gray-300 text-sm mb-2">最终得分</div>
            <div className="text-6xl font-bold text-white font-mono mb-2">
              {totalScore}
            </div>
            <div className="text-gray-400">
              满分 {maxScore} 分，得分率 {Math.round((totalScore / maxScore) * 100)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {scoreDetails.map((detail, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{detail.category}</span>
                <Trophy className={`w-4 h-4 ${getScoreColor(detail.score, detail.maxScore)}`} />
              </div>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-2xl font-bold font-mono ${getScoreColor(detail.score, detail.maxScore)}`}>
                  {detail.score}
                </span>
                <span className="text-gray-500 text-sm">/ {detail.maxScore}</span>
              </div>
              <div className="text-gray-400 text-xs">{detail.reason}</div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div
                  className={`h-full rounded-full ${
                    detail.score / detail.maxScore >= 0.8
                      ? 'bg-green-500'
                      : detail.score / detail.maxScore >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${(detail.score / detail.maxScore) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            失败原因分析
          </h3>
          {failureReasons.length === 0 ? (
            <div className="text-green-400 text-sm">无失败记录，操作良好！</div>
          ) : (
            <div className="space-y-2">
              {failureReasons.map((reason, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border-l-2 ${
                    reason.result === 'error'
                      ? 'bg-red-900/30 border-red-500'
                      : 'bg-yellow-900/30 border-yellow-500'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                    <span className="font-mono">[行号:{reason.lineNumber}]</span>
                    <span>[来源:{reason.source}]</span>
                    <span>{formatTime(reason.time)}</span>
                    <span className={reason.result === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                      [{reason.result === 'error' ? '错误' : '警告'}]
                    </span>
                  </div>
                  <div className="text-gray-200 text-sm">{reason.action}</div>
                  {reason.details && (
                    <div className="text-gray-400 text-xs mt-1">{reason.details}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Play className="w-5 h-5" />
              操作回放
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
              >
                {isPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={() => {
                  setReplayIndex(0);
                  setIsPlaying(false);
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm"
              >
                重置
              </button>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={gameResult.actionLogs.length - 1}
            value={replayIndex}
            onChange={e => {
              setReplayIndex(parseInt(e.target.value));
              setIsPlaying(false);
            }}
            className="w-full mb-4"
          />

          <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto">
            {gameResult.actionLogs.slice(0, replayIndex + 1).map((log, index) => (
              <div
                key={index}
                className={`p-2 mb-2 rounded border-l-2 ${
                  log.result === 'success'
                    ? 'bg-green-900/20 border-green-500'
                    : log.result === 'warning'
                    ? 'bg-yellow-900/20 border-yellow-500'
                    : 'bg-red-900/20 border-red-500'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-mono">[行号:{log.lineNumber}]</span>
                  <span className="text-gray-400">[来源:{log.source}]</span>
                  <span className="text-gray-500">{formatTime(log.time)}</span>
                </div>
                <div className="text-sm text-gray-200 mt-1">{log.action}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium"
          >
            再玩一次
          </button>
        </div>
      </div>
    </div>
  );
}
