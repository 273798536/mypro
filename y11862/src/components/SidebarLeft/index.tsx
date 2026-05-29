import { useMemo } from 'react';
import { Waves, Info } from 'lucide-react';
import { useSpectrumStore } from '../../store/spectrumStore';
import { formatTime } from '../../utils/audioValidator';

export function SidebarLeft() {
  const { analysisResult, hoveredPeak, selectedPeak } = useSpectrumStore();

  const stats = useMemo(() => {
    if (!analysisResult) return null;

    const { frames, sampleRate, duration, fileName, voiceLabels } = analysisResult;
    const avgEnergy = frames.reduce((sum, f) => sum + f.peakEnergy, 0) / frames.length;
    const maxEnergy = Math.max(...frames.map(f => f.peakEnergy));
    const avgFreq = frames.reduce((sum, f) => sum + f.peakFrequency, 0) / frames.length;

    return {
      fileName,
      sampleRate,
      duration,
      totalFrames: frames.length,
      avgEnergy,
      maxEnergy,
      avgFreq,
      voiceLabels,
    };
  }, [analysisResult]);

  const getEnergyLevel = (db: number) => {
    if (db > -10) return 'text-red-400';
    if (db > -25) return 'text-orange-400';
    if (db > -40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getEnergyBarWidth = (db: number) => {
    const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
    return `${normalized * 100}%`;
  };

  if (!analysisResult) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-700/50">
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            声部分层
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Waves className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-xs text-gray-500">导入音频后显示声部能量分布</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700/50">
        <h2 className="text-sm font-bold text-white mb-3" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          声部分层
        </h2>

        <div className="space-y-1.5 text-xs mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">文件</span>
            <span className="text-gray-300 font-mono truncate max-w-[120px]">{stats?.fileName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">采样率</span>
            <span className={`font-mono ${stats?.sampleRate === 44100 || stats?.sampleRate === 48000 ? 'text-green-400' : 'text-red-400'}`}>
              {stats?.sampleRate} Hz
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">时长</span>
            <span className="text-gray-300 font-mono">{formatTime(stats?.duration || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">频谱帧</span>
            <span className="text-gray-300 font-mono">{stats?.totalFrames}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          声部能量分布
        </h3>

        <div className="space-y-3">
          {stats?.voiceLabels.map((voice, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: voice.color }}
                  />
                  <span className="text-xs text-gray-300">{voice.name}</span>
                </div>
                <span className={`text-xs font-mono ${getEnergyLevel(voice.energy)}`}>
                  {voice.energy.toFixed(1)} dB
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: getEnergyBarWidth(voice.energy),
                    backgroundColor: voice.color,
                    boxShadow: `0 0 8px ${voice.color}40`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{voice.freqRange[0]} Hz</span>
                <span>{voice.freqRange[1]} Hz</span>
              </div>
            </div>
          ))}
        </div>

        {(hoveredPeak || selectedPeak) && (
          <div className="mt-6 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-400">
                {selectedPeak ? '选中峰值' : '悬停峰值'}
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">时间</span>
                <span className="text-white font-mono">
                  {formatTime((selectedPeak || hoveredPeak)?.time || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">频率</span>
                <span className="text-white font-mono">
                  {((selectedPeak || hoveredPeak)?.frequency || 0).toFixed(0)} Hz
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">能量</span>
                <span className="text-white font-mono">
                  {((selectedPeak || hoveredPeak)?.energy || 0).toFixed(1)} dB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
