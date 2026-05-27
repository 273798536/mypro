import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { GameRecord, OperationLog } from '@/types';
import { getGameRecord } from '@/utils/storage';

const actionIcons: Record<string, React.ReactNode> = {
  select: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  deselect: <XCircle className="w-4 h-4 text-slate-400" />,
  check_label: <CheckCircle2 className="w-4 h-4 text-amber-500" />,
  uncheck_label: <XCircle className="w-4 h-4 text-amber-400" />,
  submit: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
};

const actionLabels: Record<string, string> = {
  select: '选中卡牌',
  deselect: '取消选中',
  check_label: '勾选标签',
  uncheck_label: '取消标签',
  submit: '提交稽核',
};

export const ReplayPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (gameId) {
      const gameRecord = getGameRecord(gameId);
      if (gameRecord) {
        setRecord(gameRecord);
      }
    }
  }, [gameId]);

  useEffect(() => {
    if (isPlaying && record && currentIndex < record.operationLog.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (currentIndex >= (record?.operationLog.length ?? 0) - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIndex, record]);

  const handlePlay = () => {
    if (currentIndex >= (record?.operationLog.length ?? 0) - 1) {
      setCurrentIndex(-1);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
  };

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">记录不存在</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const visibleLogs = record.operationLog.slice(0, currentIndex + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">推理过程回放</h1>
            <p className="text-slate-500">{record.levelName}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">
                  {new Date(record.completedAt).toLocaleString('zh-CN')}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-amber-400 font-bold text-2xl">{record.score} 分</span>
                  <span
                    className={`inline-flex w-10 h-10 rounded-full items-center justify-center font-bold ${
                      record.grade === 'S'
                        ? 'bg-amber-500 text-white'
                        : record.grade === 'A'
                        ? 'bg-emerald-500 text-white'
                        : record.grade === 'B'
                        ? 'bg-blue-500 text-white'
                        : record.grade === 'C'
                        ? 'bg-slate-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {record.grade}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  重置
                </button>
                {isPlaying ? (
                  <button
                    onClick={handlePause}
                    className="px-6 py-2 bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors font-medium"
                  >
                    暂停
                  </button>
                ) : (
                  <button
                    onClick={handlePlay}
                    className="px-6 py-2 bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                  >
                    播放
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>进度</span>
                <span>
                  {currentIndex + 1} / {record.operationLog.length} 步
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentIndex + 1) / record.operationLog.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-500" />
              操作时间线
            </h2>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

              {record.operationLog.map((log: OperationLog, index: number) => (
                <div
                  key={index}
                  className={`relative flex items-start gap-4 py-4 transition-all duration-300 ${
                    index <= currentIndex ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      index <= currentIndex
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {actionIcons[log.action]}
                  </div>
                  <div className="flex-1 min-w-0 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800">
                        {actionLabels[log.action]}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Step {index + 1}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm mt-1">{log.details}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">操作说明</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-slate-600">选中卡牌加入线索板</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-slate-600">取消选中卡牌</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-slate-600">勾选风险标签</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-slate-600">提交稽核结果</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
