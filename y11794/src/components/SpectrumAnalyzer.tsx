import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import type { FrequencyPeak } from '../types';

interface SpectrumAnalyzerProps {
  height?: number;
  showWaveform?: boolean;
}

export function SpectrumAnalyzer({ height = 300, showWaveform = true }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { spectrum, audioData, currentRecord, parameters } = useAnalysisStore();

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrum) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const drawHeight = height;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, drawHeight);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 10; i++) {
      const y = (drawHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const { magnitudes, frequencies, binCount } = spectrum;
    const maxMagnitude = Math.max(...Array.from(magnitudes));
    
    const maxFreqToShow = Math.min(parameters.baseFrequency * 3, frequencies[binCount - 1]);
    const startBin = Math.floor(parameters.baseFrequency * 0.5 / (frequencies[1] - frequencies[0]));
    const endBin = Math.ceil(maxFreqToShow / (frequencies[1] - frequencies[0]));
    
    const visibleBins = endBin - startBin;
    const barWidth = width / visibleBins;

    const peaks = currentRecord?.results.peaks || [];
    const peakFrequencies = new Set(peaks.map(p => Math.round(p.frequency)));

    for (let i = startBin; i < Math.min(endBin, binCount); i++) {
      const x = ((i - startBin) / visibleBins) * width;
      const barHeight = (magnitudes[i] / maxMagnitude) * (drawHeight - 40);
      const y = drawHeight - barHeight - 20;

      const freq = frequencies[i];
      const isPeak = peakFrequencies.has(Math.round(freq));
      const isNoise = peaks.find(p => Math.round(p.frequency) === Math.round(freq))?.isNoise;

      if (isPeak) {
        ctx.fillStyle = isNoise ? '#FAAD14' : '#165DFF';
      } else {
        const gradient = ctx.createLinearGradient(x, y, x, drawHeight - 20);
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1E40AF');
        ctx.fillStyle = gradient;
      }

      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= 5; i++) {
      const freq = parameters.baseFrequency * 0.5 + (maxFreqToShow - parameters.baseFrequency * 0.5) * (i / 5);
      const x = (i / 5) * width;
      ctx.fillText(`${Math.round(freq)} Hz`, x, drawHeight - 5);
    }

    const dominantPeak = peaks.find(p => !p.isNoise);
    if (dominantPeak) {
      const peakX = ((dominantPeak.frequency - parameters.baseFrequency * 0.5) / (maxFreqToShow - parameters.baseFrequency * 0.5)) * width;
      
      ctx.strokeStyle = '#FF4D4F';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(peakX, 20);
      ctx.lineTo(peakX, drawHeight - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#FF4D4F';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`峰值: ${dominantPeak.frequency.toFixed(1)} Hz`, peakX + 5, 30);
    }

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('频谱分析', 10, 18);
  }, [spectrum, height, currentRecord, parameters]);

  const drawWaveform = useCallback(() => {
    if (!showWaveform || !audioData) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const waveHeight = 60 * dpr;
    const waveY = (canvas.height - waveHeight) / dpr - 10;

    const { waveform } = audioData;
    const step = Math.ceil(waveform.length / (rect.width * dpr));
    
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < rect.width * dpr; i++) {
      let min = 1;
      let max = -1;
      
      for (let j = 0; j < step; j++) {
        const v = waveform[i * step + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }

      const x = i / dpr;
      const y1 = waveY + (1 - max) * waveHeight / dpr / 2;
      const y2 = waveY + (1 - min) * waveHeight / dpr / 2;

      if (i === 0) {
        ctx.moveTo(x, y1);
      } else {
        ctx.lineTo(x, y1);
      }
    }
    
    ctx.stroke();
  }, [audioData, showWaveform]);

  useEffect(() => {
    drawSpectrum();
    if (showWaveform && audioData) {
      drawWaveform();
    }
  }, [drawSpectrum, drawWaveform, showWaveform, audioData]);

  useEffect(() => {
    const handleResize = () => {
      drawSpectrum();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawSpectrum]);

  return (
    <div className="w-full bg-dark-900 rounded-xl overflow-hidden border border-dark-700">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
      />
      
      <div className="px-4 py-3 bg-dark-800/50 border-t border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-dark-400">
            峰值: <span className="text-primary-400 font-mono">
              {currentRecord?.results.observedFrequency.toFixed(1) || '--'} Hz
            </span>
          </span>
          <span className="text-dark-400">
            频移: <span className="text-white font-mono">
              {currentRecord?.results.frequencyShift.toFixed(1) || '--'} Hz
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary-500"></span>
          <span className="text-xs text-dark-400">信号峰</span>
          <span className="w-3 h-3 rounded-full bg-warning-500 ml-2"></span>
          <span className="text-xs text-dark-400">噪声峰</span>
        </div>
      </div>
    </div>
  );
}
