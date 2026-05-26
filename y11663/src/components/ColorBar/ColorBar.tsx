
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PressureField } from '../../types';
import { DEFAULT_COLOR_STOPS, getColorForValue } from '../../utils/colorMap';
import { formatPressure } from '../../utils/colorMap';

interface ColorBarProps {
  pressureField: PressureField | null;
}

export function ColorBar({ pressureField }: ColorBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pressureField) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const colorStops = pressureField.colorInverted
      ? [...DEFAULT_COLOR_STOPS].reverse()
      : DEFAULT_COLOR_STOPS;

    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);
      const color = getColorForValue(t, 0, 1, colorStops);
      ctx.fillStyle = color;
      ctx.fillRect(x, 0, 1, height);
    }
  }, [pressureField]);

  if (!pressureField) return null;

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-2">压力分布色标</div>
      <canvas
        ref={canvasRef}
        width={200}
        height={20}
        className="w-full h-5 rounded"
      />
      <div className="flex justify-between text-xs mt-1 font-mono">
        <span className="text-blue-400">{formatPressure(pressureField.minPressure)}</span>
        <span className="text-slate-300">
          {formatPressure(
            (pressureField.minPressure + pressureField.maxPressure) / 2
          )}
        </span>
        <span className="text-red-400">{formatPressure(pressureField.maxPressure)}</span>
      </div>
      {pressureField.colorInverted && (
        <div className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
          ⚠️ 颜色映射已反转
        </div>
      )}
    </div>
  );
}
