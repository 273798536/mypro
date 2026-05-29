import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { generateColorMapTexture } from '../../utils/colormaps';
import type { ColorMapName } from '../../types';

export function ColorScaleBar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizSettings = useAppStore((s) => s.vizSettings);
  const currentResult = useAppStore((s) => s.currentResult);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const colorData = generateColorMapTexture(vizSettings.colorMap, width);

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < width; i++) {
      const r = colorData[i * 4];
      const g = colorData[i * 4 + 1];
      const b = colorData[i * 4 + 2];
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i, 0, 1, height);
    }
  }, [vizSettings.colorMap]);

  const [min, max] = vizSettings.colorRange;
  const displayMin = vizSettings.useLogScale
    ? (min > 0 ? Math.log10(min) : -4)
    : min;
  const displayMax = vizSettings.useLogScale
    ? (max > 0 ? Math.log10(max) : 0)
    : max;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">
          {vizSettings.useLogScale ? 'log₁₀(|ψ|²)' : '|ψ|²'}
        </span>
        {currentResult && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            currentResult.colorScaleCheck.passed
              ? 'bg-green-400/10 text-green-400/70'
              : 'bg-amber-400/10 text-amber-400/70'
          }`}>
            {currentResult.colorScaleCheck.passed ? '色阶正常' : '色阶异常'}
          </span>
        )}
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={12}
          className="w-full h-3 rounded-sm border border-slate-700/50"
        />
        <div className="absolute -bottom-3 left-0 right-0 flex justify-between">
          <span className="text-[9px] text-slate-600 font-mono">
            {displayMin.toFixed(vizSettings.useLogScale ? 1 : 2)}
          </span>
          <span className="text-[9px] text-slate-600 font-mono">
            {displayMax.toFixed(vizSettings.useLogScale ? 1 : 2)}
          </span>
        </div>
      </div>
    </div>
  );
}
