import React, { useEffect, useRef, useState } from 'react';
import { Activity, TrendingUp, Clock, Target, Download } from 'lucide-react';
import { useRLCStore } from '../store/useRLCStore';
import { drawChart, drawCurrentChart } from '../utils/chartRenderer';
import { getDampingTypeLabel, getDampingTypeColor } from '../engine/dampingAnalyzer';

export const ChartDisplay: React.FC = () => {
  const { result } = useRLCStore();
  const voltageCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement>(null);
  const [animationProgress, setAnimationProgress] = useState(1);
  const [showCurrentChart, setShowCurrentChart] = useState(false);

  useEffect(() => {
    if (result && voltageCanvasRef.current) {
      setAnimationProgress(0);
      const startTime = Date.now();
      const duration = 800;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimationProgress(eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [result]);

  useEffect(() => {
    if (result && voltageCanvasRef.current) {
      drawChart(voltageCanvasRef.current, result, { animationProgress });
    }
  }, [result, animationProgress]);

  useEffect(() => {
    if (result && currentCanvasRef.current && showCurrentChart) {
      drawCurrentChart(currentCanvasRef.current, result, { animationProgress });
    }
  }, [result, animationProgress, showCurrentChart]);

  const handleExportImage = () => {
    if (voltageCanvasRef.current) {
      const link = document.createElement('a');
      link.download = `rlc-response-${Date.now()}.png`;
      link.href = voltageCanvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  if (!result) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl h-full min-h-[500px] flex flex-col items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">等待计算</h3>
          <p className="text-sm text-slate-500">输入电路参数后点击"开始计算"查看响应曲线</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          暂态响应曲线
        </h2>
        <button
          onClick={handleExportImage}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          导出图片
        </button>
      </div>

      <div className="bg-slate-900/50 rounded-xl p-4 mb-6 overflow-hidden">
        <canvas
          ref={voltageCanvasRef}
          className="w-full rounded-lg"
          style={{ aspectRatio: '16/9' }}
        />
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowCurrentChart(!showCurrentChart)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-3"
        >
          <span className={`transform transition-transform ${showCurrentChart ? 'rotate-90' : ''}`}>▶</span>
          {showCurrentChart ? '隐藏' : '显示'}电流响应曲线
        </button>
        
        {showCurrentChart && (
          <div className="bg-slate-900/50 rounded-xl p-4 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
            <canvas
              ref={currentCanvasRef}
              className="w-full rounded-lg"
              style={{ aspectRatio: '16/9' }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Target className="w-4 h-4" />
            阻尼状态
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: getDampingTypeColor(result.dampingType) }}
          >
            {getDampingTypeLabel(result.dampingType)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            ζ = {result.dampingRatio.toFixed(4)}
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Activity className="w-4 h-4" />
            固有角频率
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {(result.naturalFrequency / 1000).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">krad/s</div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            过冲
          </div>
          <div className={`text-lg font-bold font-mono ${result.overshoot.exists ? 'text-red-400' : 'text-slate-500'}`}>
            {result.overshoot.exists ? `${result.overshoot.percentage.toFixed(1)}%` : '无'}
          </div>
          {result.overshoot.exists && (
            <div className="text-xs text-slate-500 mt-1">
              峰值: {result.overshoot.value.toFixed(3)}V
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Clock className="w-4 h-4" />
            上升时间
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {isFinite(result.riseTime) ? (result.riseTime * 1000).toFixed(2) : '∞'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isFinite(result.settlingTime) ? `调节: ${(result.settlingTime * 1000).toFixed(2)}ms` : '调节: ∞'}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <h3 className="text-sm font-medium text-slate-400 mb-3">特征根 s₁, s₂</h3>
        <div className="flex flex-wrap gap-4 font-mono text-sm">
          <div className="bg-slate-900/50 rounded-lg px-4 py-2">
            <span className="text-slate-500">s₁ = </span>
            <span className="text-white">{result.characteristicRoots[0].toExponential(4)}</span>
          </div>
          <div className="bg-slate-900/50 rounded-lg px-4 py-2">
            <span className="text-slate-500">s₂ = </span>
            <span className="text-white">{result.characteristicRoots[1].toExponential(4)}</span>
            {result.dampingType === 'underdamped' && <span className="text-purple-400">j</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
