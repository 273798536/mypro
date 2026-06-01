import React from 'react';
import { AudioFile, FFTSpectrum, FilterParams, FFT_SIZES, WindowType } from '../../types';
import { Mic, Cpu, Settings, Info } from 'lucide-react';

interface ParameterCardProps {
  originalFile: AudioFile | null;
  processedFile: AudioFile | null;
  spectrumBefore: FFTSpectrum | null;
  spectrumAfter: FFTSpectrum | null;
  filterParams: FilterParams | null;
}

export const ParameterCard: React.FC<ParameterCardProps> = ({
  originalFile,
  processedFile,
  spectrumBefore,
  spectrumAfter,
  filterParams,
}) => {
  const formatFreq = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)} kHz`;
    }
    return `${freq} Hz`;
  };

  return (
    <div className="space-y-4">
      <div className="card-surface spectrum-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="w-4 h-4 text-spectrum-cyan" />
          <span className="font-display font-semibold text-sm text-slate-200">音频信息</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 data-grid">
          <div>
            <div className="data-grid-header">原始材料</div>
            <div className="data-grid-value">{originalFile?.name || '-'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {originalFile ? `${originalFile.sampleRate} Hz / ${originalFile.bitDepth} bit` : '-'}
            </div>
          </div>
          <div>
            <div className="data-grid-header">处理结果</div>
            <div className="data-grid-value">{processedFile?.name || '-'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {processedFile ? `${processedFile.sampleRate} Hz / ${processedFile.bitDepth} bit` : '-'}
            </div>
          </div>
          <div>
            <div className="data-grid-header">时长</div>
            <div className="data-grid-value">
              {originalFile ? `${originalFile.duration.toFixed(2)}s` : '-'}
            </div>
          </div>
          <div>
            <div className="data-grid-header">声道</div>
            <div className="data-grid-value">
              {originalFile ? `${originalFile.numberOfChannels}ch` : '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface spectrum-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-spectrum-purple" />
          <span className="font-display font-semibold text-sm text-slate-200">FFT 参数</span>
        </div>
        
        <div className="grid grid-cols-3 gap-3 data-grid">
          <div>
            <div className="data-grid-header">FFT 尺寸</div>
            <div className="data-grid-value">{spectrumBefore?.fftSize || '-'}</div>
          </div>
          <div>
            <div className="data-grid-header">窗函数</div>
            <div className="data-grid-value capitalize">{spectrumBefore?.windowType || '-'}</div>
          </div>
          <div>
            <div className="data-grid-header">频率分辨率</div>
            <div className="data-grid-value">
              {spectrumBefore 
                ? `${(spectrumBefore.sampleRate / spectrumBefore.fftSize).toFixed(1)} Hz`
                : '-'}
            </div>
          </div>
        </div>
        
        {spectrumBefore && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Info className="w-3 h-3" />
              <span>
                可用 FFT 尺寸: {FFT_SIZES.join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {filterParams && (
        <div className="card-surface spectrum-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-spectrum-pink" />
            <span className="font-display font-semibold text-sm text-slate-200">滤波参数</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 data-grid">
            <div>
              <div className="data-grid-header">滤波类型</div>
              <div className="data-grid-value capitalize">
                {filterParams.filterType === 'lowpass' && '低通'}
                {filterParams.filterType === 'highpass' && '高通'}
                {filterParams.filterType === 'bandpass' && '带通'}
                {filterParams.filterType === 'notch' && '陷波'}
              </div>
            </div>
            <div>
              <div className="data-grid-header">阶数</div>
              <div className="data-grid-value">{filterParams.order}</div>
            </div>
            <div>
              <div className="data-grid-header">低频截止</div>
              <div className="data-grid-value text-spectrum-cyan">
                {formatFreq(filterParams.lowFreq)}
              </div>
            </div>
            <div>
              <div className="data-grid-header">高频截止</div>
              <div className="data-grid-value text-spectrum-pink">
                {formatFreq(filterParams.highFreq)}
              </div>
            </div>
            <div>
              <div className="data-grid-header">增益</div>
              <div className="data-grid-value">{filterParams.gain} dB</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
