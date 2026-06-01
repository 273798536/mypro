import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FFTSpectrum, FREQUENCY_RANGE } from '../../types';
import { magnitudeToDB } from '../../utils/fft';
import { getColor, getFrequencyLabel, findPeaks, rgbToString, lerp } from '../../utils/colorMaps';
import { useAppStore } from '../../store/useAppStore';
import { Maximize2, Minimize2, Activity, Zap } from 'lucide-react';

interface SpectrumAnalyzerProps {
  spectrumBefore: FFTSpectrum | null;
  spectrumAfter: FFTSpectrum | null;
  height?: number;
  showLegend?: boolean;
}

export const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  spectrumBefore,
  spectrumAfter,
  height = 300,
  showLegend = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ freq: number; mag: number; x: number; y: number } | null>(null);
  
  const { viewState, filterParams, updateViewState } = useAppStore();
  const { frequencyScale, amplitudeScale, showOriginal, showProcessed } = viewState;

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const drawHeight = height;
    const padding = { top: 20, right: 50, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = drawHeight - padding.top - padding.bottom;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, drawHeight);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const freqMarkers = frequencyScale === 'log'
      ? [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
      : [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000];

    freqMarkers.forEach(freq => {
      let x: number;
      if (frequencyScale === 'log') {
        const logMin = Math.log10(FREQUENCY_RANGE.min);
        const logMax = Math.log10(FREQUENCY_RANGE.max);
        const logFreq = Math.log10(Math.max(freq, FREQUENCY_RANGE.min));
        x = padding.left + ((logFreq - logMin) / (logMax - logMin)) * chartWidth;
      } else {
        x = padding.left + (freq / FREQUENCY_RANGE.max) * chartWidth;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, drawHeight - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(getFrequencyLabel(freq), x, drawHeight - padding.bottom + 15);
    });

    const dbMarkers = [-120, -100, -80, -60, -40, -20, 0];
    dbMarkers.forEach(db => {
      const y = padding.top + chartHeight - ((db - (-120)) / 120) * chartHeight;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`${db} dB`, padding.left - 8, y + 4);
    });

    const getX = (freq: number): number => {
      if (frequencyScale === 'log') {
        const logMin = Math.log10(FREQUENCY_RANGE.min);
        const logMax = Math.log10(FREQUENCY_RANGE.max);
        const logFreq = Math.log10(Math.max(freq, FREQUENCY_RANGE.min));
        return padding.left + ((logFreq - logMin) / (logMax - logMin)) * chartWidth;
      } else {
        return padding.left + (freq / FREQUENCY_RANGE.max) * chartWidth;
      }
    };

    const getY = (mag: number): number => {
      const db = amplitudeScale === 'db' ? mag : 20 * Math.log10(Math.max(mag, 1e-10));
      return padding.top + chartHeight - ((Math.max(db, -120) - (-120)) / 120) * chartHeight;
    };

    if (showOriginal && spectrumBefore) {
      const magDB = amplitudeScale === 'db' 
        ? magnitudeToDB(spectrumBefore.frequencyData)
        : spectrumBefore.frequencyData;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < spectrumBefore.binFrequencies.length; i++) {
        const freq = spectrumBefore.binFrequencies[i];
        if (freq < FREQUENCY_RANGE.min || freq > FREQUENCY_RANGE.max) continue;
        
        const x = getX(freq);
        const y = getY(magDB[i]);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, drawHeight - padding.bottom);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      
      ctx.lineTo(width - padding.right, drawHeight - padding.bottom);
      ctx.lineTo(padding.left, drawHeight - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    if (showProcessed && spectrumAfter) {
      const magDB = amplitudeScale === 'db'
        ? magnitudeToDB(spectrumAfter.frequencyData)
        : spectrumAfter.frequencyData;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.9)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < spectrumAfter.binFrequencies.length; i++) {
        const freq = spectrumAfter.binFrequencies[i];
        if (freq < FREQUENCY_RANGE.min || freq > FREQUENCY_RANGE.max) continue;
        
        const x = getX(freq);
        const y = getY(magDB[i]);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      const gradient = ctx.createLinearGradient(0, padding.top, 0, drawHeight - padding.bottom);
      gradient.addColorStop(0, 'rgba(236, 72, 153, 0.25)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');
      
      ctx.lineTo(width - padding.right, drawHeight - padding.bottom);
      ctx.lineTo(padding.left, drawHeight - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    if (showOriginal && showProcessed && spectrumBefore && spectrumAfter) {
      const { lowFreq, highFreq, filterType } = filterParams;
      const x1 = getX(lowFreq);
      const x2 = getX(highFreq);
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
      ctx.fillRect(x1, padding.top, x2 - x1, chartHeight);
      
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x1, padding.top);
      ctx.lineTo(x1, drawHeight - padding.bottom);
      ctx.moveTo(x2, padding.top);
      ctx.lineTo(x2, drawHeight - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (showOriginal && spectrumBefore && amplitudeScale === 'db') {
      const magDB = magnitudeToDB(spectrumBefore.frequencyData);
      const peaks = findPeaks(magDB, spectrumBefore.binFrequencies, 0.6, 10);
      
      peaks.slice(0, 5).forEach(peak => {
        if (peak.frequency < FREQUENCY_RANGE.min || peak.frequency > FREQUENCY_RANGE.max) return;
        
        const x = getX(peak.frequency);
        const y = getY(peak.magnitude);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    const colorBarWidth = 20;
    const colorBarX = width - padding.right + 15;
    for (let i = 0; i < chartHeight; i++) {
      const value = lerp(0, -120, i / chartHeight);
      const [r, g, b] = getColor(value, -120, 0, 'spectrum');
      ctx.fillStyle = rgbToString(r, g, b, 0.6);
      ctx.fillRect(colorBarX, padding.top + i, colorBarWidth, 1);
    }
    
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(colorBarX, padding.top, colorBarWidth, chartHeight);

  }, [spectrumBefore, spectrumAfter, height, frequencyScale, amplitudeScale, showOriginal, showProcessed, filterParams]);

  useEffect(() => {
    drawSpectrum();
    
    const handleResize = () => drawSpectrum();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [drawSpectrum]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrumBefore) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const padding = { top: 20, right: 50, bottom: 30, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (x < padding.left || x > rect.width - padding.right) {
      setHoverInfo(null);
      return;
    }

    let freq: number;
    if (frequencyScale === 'log') {
      const logMin = Math.log10(FREQUENCY_RANGE.min);
      const logMax = Math.log10(FREQUENCY_RANGE.max);
      const logFreq = logMin + ((x - padding.left) / chartWidth) * (logMax - logMin);
      freq = Math.pow(10, logFreq);
    } else {
      freq = ((x - padding.left) / chartWidth) * FREQUENCY_RANGE.max;
    }

    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < spectrumBefore.binFrequencies.length; i++) {
      const diff = Math.abs(spectrumBefore.binFrequencies[i] - freq);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    const magDB = amplitudeScale === 'db'
      ? magnitudeToDB(spectrumBefore.frequencyData)[closestIndex]
      : spectrumBefore.frequencyData[closestIndex];

    setHoverInfo({
      freq,
      mag: magDB,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative card-surface spectrum-border transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={{ height: isFullscreen ? 'calc(100vh - 32px)' : height }}
    >
      <div className="flex items-center justify-between p-3 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-spectrum-cyan" />
          <span className="font-display font-semibold text-sm text-slate-200">FFT 频谱分析</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showOriginal}
                onChange={(e) => updateViewState({ showOriginal: e.target.checked })}
                className="w-3 h-3 accent-cyan-500"
              />
              <span className="text-cyan-400">原始</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showProcessed}
                onChange={(e) => updateViewState({ showProcessed: e.target.checked })}
                className="w-3 h-3 accent-pink-500"
              />
              <span className="text-pink-400">处理后</span>
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateViewState({ frequencyScale: frequencyScale === 'log' ? 'linear' : 'log' })}
              className="px-2 py-1 text-[10px] font-mono rounded border border-slate-600/30 hover:border-spectrum-cyan/50 transition-colors"
            >
              {frequencyScale === 'log' ? 'LOG' : 'LIN'}
            </button>
            <button
              onClick={() => updateViewState({ amplitudeScale: amplitudeScale === 'db' ? 'linear' : 'db' })}
              className="px-2 py-1 text-[10px] font-mono rounded border border-slate-600/30 hover:border-spectrum-cyan/50 transition-colors"
            >
              {amplitudeScale === 'db' ? 'dB' : 'LIN'}
            </button>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-slate-700/30 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-slate-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>
      
      <div className="relative" style={{ height: isFullscreen ? 'calc(100% - 50px)' : height - 50 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        
        {hoverInfo && (
          <div
            className="absolute pointer-events-none z-10 px-3 py-2 bg-surface-lighter/95 border border-slate-600/50 rounded-lg shadow-xl"
            style={{
              left: hoverInfo.x + 10,
              top: hoverInfo.y - 40,
            }}
          >
            <div className="font-mono text-[10px] text-slate-300">
              <div>频率: <span className="text-spectrum-cyan">{getFrequencyLabel(hoverInfo.freq)}Hz</span></div>
              <div>幅值: <span className="text-spectrum-purple">{hoverInfo.mag.toFixed(1)} dB</span></div>
            </div>
          </div>
        )}
      </div>
      
      {showLegend && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-spectrum-cyan" />
            <span className="text-[10px] text-slate-400 font-mono">滤波前</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-spectrum-pink" />
            <span className="text-[10px] text-slate-400 font-mono">滤波后</span>
          </div>
          {spectrumBefore && (
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-spectrum-purple" />
              <span className="text-[10px] text-slate-400 font-mono">
                FFT: {spectrumBefore.fftSize} | 窗函数: {spectrumBefore.windowType}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
