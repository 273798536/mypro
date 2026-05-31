import { useEffect, useState } from 'react';
import { Gauge, AlertTriangle, CheckCircle, Info, Copy, RotateCcw } from 'lucide-react';
import type { CalculateResult } from '@shared/types';

interface ResultDisplayProps {
  result: CalculateResult;
  onReset: () => void;
}

function AnimatedNumber({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, value);
      setDisplay(current);
      if (step >= steps) {
        setDisplay(value);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}

export default function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-amber-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'from-emerald-50 to-emerald-100 border-emerald-200';
    if (score >= 6) return 'from-amber-50 to-amber-100 border-amber-200';
    if (score >= 4) return 'from-orange-50 to-orange-100 border-orange-200';
    return 'from-red-50 to-red-100 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '😐';
    if (score >= 4) return '😟';
    return '😫';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: "'Playfair Display', serif" }}>
          计算结果
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
            className="p-2 text-slate-500 hover:text-[#0A2463] hover:bg-slate-100 rounded-lg transition-colors"
            title="复制结果"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onReset}
            className="p-2 text-slate-500 hover:text-[#0A2463] hover:bg-slate-100 rounded-lg transition-colors"
            title="重新计算"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {result.isDuplicate && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">重复计算提示</p>
            <p className="text-xs text-blue-600 mt-1">
              相同参数的计算结果已存在于历史记录中，本次标记为重复记录。
              重复记录ID：{result.duplicateOf?.substring(0, 8)}...
            </p>
          </div>
        </div>
      )}

      {!result.calculationSuccess ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">计算失败</h3>
              <p className="text-red-700 mt-2">{result.failureReason}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`p-6 rounded-xl border-2 bg-gradient-to-br ${getScoreBg(result.comfortScore)}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">舒适度评分</p>
                <div className={`text-6xl font-bold ${getScoreColor(result.comfortScore)}`}>
                  <AnimatedNumber value={result.comfortScore} decimals={0} />
                  <span className="text-2xl">/10</span>
                </div>
                <p className={`text-xl font-semibold mt-2 ${getScoreColor(result.comfortScore)}`}>
                  {getScoreIcon(result.comfortScore)} {result.comfortLevel}
                </p>
              </div>
              <div className="text-7xl">{getScoreIcon(result.comfortScore)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 backdrop-blur rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">横摇频率</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={result.rollFrequency} />
                  <span className="text-sm font-normal text-slate-500 ml-1">{result.rollFrequencyUnit}</span>
                </p>
              </div>
              <div className="bg-white/60 backdrop-blur rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">横摇幅值</p>
                <p className="text-2xl font-bold text-slate-800">
                  <AnimatedNumber value={result.rollAmplitude} decimals={3} />
                  <span className="text-sm font-normal text-slate-500 ml-1">{result.rollAmplitudeUnit}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-5 h-5 text-[#0A2463]" />
                <h3 className="font-semibold text-slate-800">计算结果说明</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-slate-600 w-24 flex-shrink-0">横摇频率</span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">
                      {result.rollFrequency.toFixed(4)} {result.rollFrequencyUnit}
                      <span className="text-slate-400 ml-2">（范围：0.2-1.5 rad/s 为常规客船典型值）</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      表示船舶在静水中的固有横摇周期，频率越低说明船舶越" sluggish"，越容易发生共振
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-slate-600 w-24 flex-shrink-0">横摇幅值</span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">
                      {result.rollAmplitude.toFixed(3)} {result.rollAmplitudeUnit}
                      <span className="text-slate-400 ml-2">（&lt;5° 为舒适，&gt;15° 为严重不适）</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      估算的船舶横摇运动幅值，与波浪条件、船舶航向和航速密切相关
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-slate-600 w-24 flex-shrink-0">舒适度等级</span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-800">{result.comfortLevel}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      基于 ISO 2631-1 标准，根据横摇加速度加权计算的 10 级评分
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-800 mb-2">适用范围说明</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">{result.applicableScope}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="text-xs text-slate-400 text-center">
        计算时间：{new Date(result.createdAt).toLocaleString('zh-CN')}
        {' · '}
        记录ID：{result.id.substring(0, 8)}...
      </div>
    </div>
  );
}
