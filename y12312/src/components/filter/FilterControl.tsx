import React, { useState } from 'react';
import { FilterType, FFT_SIZES, WindowType, FREQUENCY_RANGE, FILTER_TYPE_LABELS } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Sliders, Play, RefreshCw, Zap } from 'lucide-react';

export const FilterControl: React.FC = () => {
  const {
    filterParams,
    fftConfig,
    updateFilterParams,
    updateFFTConfig,
    analyzeAudio,
    applyFilter,
    isProcessing,
    processingProgress,
    spectrumBefore,
    spectrumAfter,
  } = useAppStore();

  const formatFreq = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)} kHz`;
    }
    return `${freq} Hz`;
  };

  const handleFreqChange = (type: 'low' | 'high', value: number) => {
    if (type === 'low') {
      updateFilterParams({ lowFreq: Math.min(value, filterParams.highFreq - 10) });
    } else {
      updateFilterParams({ highFreq: Math.max(value, filterParams.lowFreq + 10) });
    }
  };

  return (
    <div className="card-surface spectrum-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-4 h-4 text-spectrum-purple" />
        <span className="font-display font-semibold text-sm text-slate-200">滤波器控制</span>
      </div>

      {isProcessing && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-3 h-3 text-spectrum-cyan animate-spin" />
            <span className="text-xs text-slate-400">处理中... {processingProgress}%</span>
          </div>
          <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-spectrum-gradient transition-all duration-300"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="data-grid-header block mb-2">滤波类型</label>
          <div className="grid grid-cols-4 gap-1">
            {(['lowpass', 'highpass', 'bandpass', 'notch'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => updateFilterParams({ filterType: type })}
                className={`px-2 py-1.5 text-[10px] font-mono rounded border transition-all ${
                  filterParams.filterType === type
                    ? 'bg-spectrum-gradient-soft border-spectrum-cyan/50 text-spectrum-cyan'
                    : 'border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                }`}
              >
                {FILTER_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="data-grid-header block mb-1">
              低频截止
              <span className="text-spectrum-cyan ml-1">{formatFreq(filterParams.lowFreq)}</span>
            </label>
            <input
              type="range"
              min={FREQUENCY_RANGE.min}
              max={FREQUENCY_RANGE.max}
              value={filterParams.lowFreq}
              onChange={(e) => handleFreqChange('low', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-spectrum-cyan"
            />
          </div>
          <div>
            <label className="data-grid-header block mb-1">
              高频截止
              <span className="text-spectrum-pink ml-1">{formatFreq(filterParams.highFreq)}</span>
            </label>
            <input
              type="range"
              min={FREQUENCY_RANGE.min}
              max={FREQUENCY_RANGE.max}
              value={filterParams.highFreq}
              onChange={(e) => handleFreqChange('high', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-spectrum-pink"
            />
          </div>
        </div>

        <div>
          <label className="data-grid-header block mb-1">
            滤波器阶数
            <span className="text-spectrum-purple ml-1">{filterParams.order}</span>
          </label>
          <input
            type="range"
            min="31"
            max="1023"
            step="2"
            value={filterParams.order}
            onChange={(e) => updateFilterParams({ order: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer accent-spectrum-purple"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="data-grid-header block mb-1">FFT 尺寸</label>
            <select
              value={fftConfig.fftSize}
              onChange={(e) => updateFFTConfig({ fftSize: parseInt(e.target.value) })}
              className="w-full px-2 py-1.5 text-xs bg-surface/50 border border-slate-600/30 rounded focus:outline-none focus:border-spectrum-cyan/50"
            >
              {FFT_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="data-grid-header block mb-1">窗函数</label>
            <select
              value={fftConfig.windowType}
              onChange={(e) => updateFFTConfig({ windowType: e.target.value as WindowType })}
              className="w-full px-2 py-1.5 text-xs bg-surface/50 border border-slate-600/30 rounded focus:outline-none focus:border-spectrum-cyan/50"
            >
              <option value="hann">Hann</option>
              <option value="hamming">Hamming</option>
              <option value="blackman">Blackman</option>
              <option value="rectangular">Rectangular</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={analyzeAudio}
            disabled={isProcessing}
            className="btn-spectrum flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>FFT 分析</span>
          </button>
          <button
            onClick={applyFilter}
            disabled={isProcessing || !spectrumBefore}
            className="btn-spectrum-outline flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            <span>应用滤波</span>
          </button>
        </div>

        {(spectrumBefore || spectrumAfter) && (
          <div className="pt-3 border-t border-slate-700/30 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>分析状态</span>
              <span className={spectrumBefore ? 'text-emerald-400' : 'text-slate-500'}>
                {spectrumBefore ? '已完成频谱分析' : '待分析'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>滤波状态</span>
              <span className={spectrumAfter ? 'text-emerald-400' : 'text-slate-500'}>
                {spectrumAfter ? '已完成滤波处理' : '待滤波'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
