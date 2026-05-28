import { useCallback } from 'react';
import { Settings, ArrowRightToLine, ArrowLeftToLine, Volume2 } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import type { Direction } from '../types';

export function ParameterPanel() {
  const { parameters, setParameters, audioData } = useAnalysisStore();

  const handleBaseFrequencyChange = useCallback((value: number) => {
    setParameters({ baseFrequency: Math.max(20, Math.min(20000, value)) });
  }, [setParameters]);

  const handleSampleRateChange = useCallback((value: number) => {
    setParameters({ sampleRate: Math.max(8000, Math.min(192000, value)) });
  }, [setParameters]);

  const handleDirectionChange = useCallback((direction: Direction) => {
    setParameters({ direction });
  }, [setParameters]);

  const handleNoiseThresholdChange = useCallback((value: number) => {
    setParameters({ noiseThreshold: Math.max(0, Math.min(1, value)) });
  }, [setParameters]);

  const syncSampleRate = useCallback(() => {
    if (audioData) {
      setParameters({ sampleRate: audioData.sampleRate });
    }
  }, [audioData, setParameters]);

  return (
    <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
      <div className="px-4 py-3 bg-dark-800 border-b border-dark-700 flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary-400" />
        <span className="font-medium text-white">分析参数</span>
      </div>
      
      <div className="p-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-dark-300">基准频率</label>
            <span className="text-xs text-dark-500">声源发射频率</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={parameters.baseFrequency}
              onChange={(e) => handleBaseFrequencyChange(Number(e.target.value))}
              className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary-500 transition-colors"
              min={20}
              max={20000}
            />
            <span className="text-dark-400 text-sm font-medium w-10">Hz</span>
          </div>
          <input
            type="range"
            value={parameters.baseFrequency}
            onChange={(e) => handleBaseFrequencyChange(Number(e.target.value))}
            min={100}
            max={5000}
            step={10}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-dark-300">采样率</label>
            {audioData && (
              <button
                onClick={syncSampleRate}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                同步到音频文件
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={parameters.sampleRate}
              onChange={(e) => handleSampleRateChange(Number(e.target.value))}
              className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary-500 transition-colors"
              min={8000}
              max={192000}
            />
            <span className="text-dark-400 text-sm font-medium w-10">Hz</span>
          </div>
          <div className="flex gap-2">
            {[8000, 22050, 44100, 48000].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSampleRateChange(rate)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  parameters.sampleRate === rate
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                {rate >= 1000 ? `${rate/1000}k` : rate}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-dark-300">移动方向</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDirectionChange('approaching')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                parameters.direction === 'approaching'
                  ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                  : 'bg-dark-900 border-dark-600 text-dark-300 hover:border-dark-500'
              }`}
            >
              <ArrowRightToLine className="w-4 h-4" />
              <span className="text-sm">靠近观察者</span>
            </button>
            <button
              onClick={() => handleDirectionChange('receding')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                parameters.direction === 'receding'
                  ? 'bg-primary-500/20 border-primary-500 text-primary-300'
                  : 'bg-dark-900 border-dark-600 text-dark-300 hover:border-dark-500'
              }`}
            >
              <ArrowLeftToLine className="w-4 h-4" />
              <span className="text-sm">远离观察者</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-dark-300">噪声阈值</label>
            <span className="text-xs text-dark-500 flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {(parameters.noiseThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            value={parameters.noiseThreshold}
            onChange={(e) => handleNoiseThresholdChange(Number(e.target.value))}
            min={0}
            max={1}
            step={0.05}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-warning-500"
          />
          <div className="flex justify-between text-xs text-dark-500">
            <span>低</span>
            <span>高</span>
          </div>
        </div>
      </div>
    </div>
  );
}
