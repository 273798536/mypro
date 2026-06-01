import { useEffect, useRef, useState } from 'react';
import { Point, ColorScheme } from '@/types';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface FractalCanvasProps {
  points: Point[];
  colorScheme: ColorScheme;
  width?: number;
  height?: number;
  showError?: boolean;
  errorType?: string;
}

export default function FractalCanvas({
  points,
  colorScheme,
  width = 600,
  height = 500,
  showError = false,
  errorType,
}: FractalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = colorScheme.background;
    ctx.fillRect(0, 0, width, height);

    if (points.length < 2) return;

    ctx.save();
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (colorScheme.fill && colorScheme.fill !== 'transparent') {
      ctx.fillStyle = colorScheme.fill;
      ctx.fill();
    }

    ctx.strokeStyle = colorScheme.stroke;
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    ctx.restore();
  }, [points, colorScheme, width, height, zoom, offset]);

  const getCanvas = () => canvasRef.current;

  (window as any).getFractalCanvas = getCanvas;

  return (
    <div className={`relative rounded-lg overflow-hidden ${showError && errorType === 'explosion' ? 'ring-4 ring-accent-danger animate-pulse' : ''}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg"
      />
      
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(z * 1.2, 5))}
          className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-all"
        >
          <ZoomIn className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z / 1.2, 0.2))}
          className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-all"
        >
          <ZoomOut className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="bg-white/90 hover:bg-white p-2 rounded-lg shadow-md transition-all"
        >
          <Maximize2 className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-lg shadow-sm">
        <span className="text-xs text-gray-600 font-mono">缩放: {(zoom * 100).toFixed(0)}%</span>
      </div>

      {showError && errorType === 'explosion' && (
        <div className="absolute top-4 right-4 bg-accent-danger text-white px-3 py-1 rounded-lg shadow-md animate-pulse">
          <span className="text-xs font-bold">⚠ 迭代爆炸</span>
        </div>
      )}
    </div>
  );
}
