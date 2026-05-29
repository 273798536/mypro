import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, FileText, Trophy, XCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';
import { generateExportReport } from '../utils/exportGenerator';
import type { ExportReport } from '../data/types';
import RouteSequence from '../components/result/RouteSequence';
import FailureList from '../components/result/FailureList';
import TemperatureChart from '../components/result/TemperatureChart';
import ExportPanel from '../components/export/ExportPanel';
import { cn } from '@/lib/utils';

const ResultPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);

  const gameState = useGameStore();
  const level = levelId ? getLevelById(levelId) : undefined;

  useEffect(() => {
    if (levelId && gameState.levelId !== levelId) {
      navigate('/');
    }
  }, [levelId, gameState.levelId, navigate]);

  if (!level) {
    return (
      <div className="min-h-screen bg-cold-chain-dark flex items-center justify-center">
        <p className="text-white font-mono">关卡不存在</p>
      </div>
    );
  }

  const isPassed = gameState.failureReasons.length === 0;
  const report: ExportReport = generateExportReport(level, gameState, '培训学员');

  const zoneFailures = gameState.failureReasons.filter(f => f.type === 'zone_mismatch');
  const orderFailures = gameState.failureReasons.filter(f => f.type === 'delivery_order_blocked');
  const timeoutFailures = gameState.failureReasons.filter(f => f.type === 'timeout');

  return (
    <div className="min-h-screen bg-cold-chain-dark text-white">
      <header className="sticky top-0 z-40 bg-cold-chain-dark/95 backdrop-blur-sm border-b border-cold-chain-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-cold-chain-panel rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-lg">装车结果 - {level.originalName}</h1>
                <p className="text-xs text-gray-400 font-mono">
                  {isPassed ? '🎉 恭喜通关！' : '⚠️ 存在问题需要整改'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                isPassed
                  ? 'bg-cold-chain-success/20 border border-cold-chain-success/50'
                  : 'bg-cold-chain-danger/20 border border-cold-chain-danger/50'
              )}>
                {isPassed ? (
                  <Trophy className="w-5 h-5 text-cold-chain-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-cold-chain-danger" />
                )}
                <span className={cn(
                  'font-mono font-bold',
                  isPassed ? 'text-cold-chain-success' : 'text-cold-chain-danger'
                )}>
                  {isPassed ? '通过' : '未通过'}
                </span>
              </div>

              <button
                onClick={() => navigate(`/game/${levelId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-cold-chain-primary hover:bg-cold-chain-primary/80 rounded-lg font-mono text-sm transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重新挑战
              </button>

              <button
                onClick={() => setShowExport(!showExport)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-colors',
                  showExport
                    ? 'bg-cold-chain-chilled text-white'
                    : 'bg-cold-chain-panel hover:bg-cold-chain-panel/80 border border-cold-chain-border'
                )}
              >
                <FileText className="w-4 h-4" />
                {showExport ? '返回结果' : '查看/导出报告'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {!showExport ? (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4">
                <div className="text-xs text-gray-400 font-mono mb-1">温层混放</div>
                <div className={cn(
                  'font-mono text-2xl font-bold',
                  zoneFailures.length > 0 ? 'text-cold-chain-danger' : 'text-cold-chain-success'
                )}>
                  {zoneFailures.length} 处
                </div>
              </div>
              <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4">
                <div className="text-xs text-gray-400 font-mono mb-1">顺序错误</div>
                <div className={cn(
                  'font-mono text-2xl font-bold',
                  orderFailures.length > 0 ? 'text-cold-chain-warning' : 'text-cold-chain-success'
                )}>
                  {orderFailures.length} 处
                </div>
              </div>
              <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4">
                <div className="text-xs text-gray-400 font-mono mb-1">超时升温</div>
                <div className={cn(
                  'font-mono text-2xl font-bold',
                  timeoutFailures.length > 0 ? 'text-cold-chain-danger' : 'text-cold-chain-success'
                )}>
                  {timeoutFailures.length > 0 ? '是' : '否'}
                </div>
              </div>
              <div className="bg-cold-chain-panel rounded-xl border-2 border-cold-chain-border p-4">
                <div className="text-xs text-gray-400 font-mono mb-1">最高温度</div>
                <div className={cn(
                  'font-mono text-2xl font-bold',
                  gameState.currentTemperature > 8 ? 'text-cold-chain-danger' : 'text-cold-chain-success'
                )}>
                  {Math.max(...gameState.temperatureHistory.map(t => t.temp)).toFixed(1)}°C
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 space-y-6">
                <RouteSequence level={level} gameState={gameState} />
                <FailureList failures={gameState.failureReasons} />
              </div>
              <div className="col-span-4">
                <TemperatureChart temperatureHistory={gameState.temperatureHistory} />
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <ExportPanel report={report} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultPage;
