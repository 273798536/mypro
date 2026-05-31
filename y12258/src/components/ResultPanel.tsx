import React from 'react';
import { Trophy, XCircle, Download, RotateCcw, Home, DollarSign, Wind, Gauge, Clock, FileJson } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { downloadExportData } from '../utils/export';
import { VibrationChart } from './VibrationChart';
import { EvidenceTimeline } from './EvidenceTimeline';

export const ResultPanel: React.FC = () => {
  const {
    phase,
    failReason,
    failDetail,
    windLevel,
    targetWindLevel,
    budget,
    currentLevel,
    vibrationHistory,
    resetGame,
    goToMenu
  } = useGameStore();

  const isSuccess = phase === 'success';
  
  const peakAmplitude = Math.max(...vibrationHistory.map(f => f.amplitude), 0);
  const peakStress = Math.max(...vibrationHistory.map(f => f.maxStress), 0);

  const getFailReasonText = () => {
    switch (failReason) {
      case 'resonance': return '共振破坏';
      case 'overload': return '杆件过载';
      case 'overbudget': return '预算超支';
      default: return '未知原因';
    }
  };

  const finalScore = isSuccess
    ? Math.floor(windLevel * 100 + (budget.total - budget.used) / 100)
    : Math.floor(windLevel * 50);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`p-8 ${isSuccess ? 'bg-gradient-to-r from-emerald-900/50 to-cyan-900/50' : 'bg-gradient-to-r from-red-900/50 to-orange-900/50'} border-b border-slate-700`}>
          <div className="flex items-center gap-4 mb-4">
            {isSuccess ? (
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                <Trophy size={32} className="text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                <XCircle size={32} className="text-white" />
              </div>
            )}
            <div>
              <h2 className="text-3xl font-bold text-white">
                {isSuccess ? '挑战成功！' : '挑战失败'}
              </h2>
              <p className="text-slate-300 mt-1">
                {isSuccess 
                  ? `恭喜你通过了「${currentLevel?.name}」！` 
                  : `失败原因: ${getFailReasonText()}`
                }
              </p>
              {!isSuccess && failDetail && (
                <p className="text-red-400 text-sm mt-1">{failDetail}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Trophy size={14} />
                最终得分
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">{finalScore}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Wind size={14} />
                最高风载
              </div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">Lv.{windLevel} / {targetWindLevel}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <DollarSign size={14} />
                预算使用
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">¥{(budget.total - budget.used).toLocaleString()}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Gauge size={14} />
                峰值振幅
              </div>
              <div className="text-2xl font-bold text-orange-400 font-mono">{peakAmplitude.toFixed(1)}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <VibrationChart />
            <EvidenceTimeline />
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <FileJson size={18} />
              数据导出
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              导出完整的游戏数据，包括桥梁结构、预算明细、振动历史和完整证据链。
              数据以JSON格式保存，可用于复盘分析。
            </p>
            <div className="flex gap-3">
              <button
                onClick={downloadExportData}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
              >
                <Download size={18} />
                导出完整证据链 (JSON)
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={resetGame}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={18} />
              重新挑战
            </button>
            <button
              onClick={goToMenu}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Home size={18} />
              返回菜单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
