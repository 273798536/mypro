import { useRef, useEffect } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { GRID_WIDTH, GRID_HEIGHT } from '../utils/wavePhysics';

export function WaterSurface2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { waveData, obstacles, sources, warnings, showComparison, baselineWaveData } =
    useSimulationStore((state) => ({
      waveData: state.simulation.waveData,
      obstacles: state.obstacles,
      sources: state.sources,
      warnings: state.warnings.filter((w) => !w.dismissed),
      showComparison: state.simulation.showComparison,
      baselineWaveData: state.simulation.baselineWaveData,
    }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const cellWidth = width / GRID_WIDTH;
    const cellHeight = height / GRID_HEIGHT;

    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const idx = y * GRID_WIDTH + x;
        const value = waveData[idx];

        const normalizedValue = Math.max(-1, Math.min(1, value));
        const intensity = (normalizedValue + 1) / 2;

        const r = Math.floor(intensity * 0);
        const g = Math.floor(intensity * 150 + 50);
        const b = Math.floor(intensity * 200 + 55);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }

    if (showComparison && baselineWaveData) {
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
      ctx.lineWidth = 1;
      for (let y = 0; y < GRID_HEIGHT; y += 5) {
        for (let x = 0; x < GRID_WIDTH; x += 5) {
          const idx = y * GRID_WIDTH + x;
          const diff = Math.abs(waveData[idx] - baselineWaveData[idx]);
          if (diff > 0.15) {
            ctx.strokeRect(
              x * cellWidth - 2,
              y * cellHeight - 2,
              cellWidth * 5 + 4,
              cellHeight * 5 + 4
            );
          }
        }
      }
    }

    for (const obs of obstacles) {
      ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;

      if (obs.type === 'rect' && obs.width && obs.height) {
        ctx.save();
        ctx.translate((obs.x / GRID_WIDTH) * width, (obs.y / GRID_HEIGHT) * height);
        ctx.rotate(obs.rotation || 0);
        ctx.fillRect(
          (-obs.width / 2 / GRID_WIDTH) * width,
          (-obs.height / 2 / GRID_HEIGHT) * height,
          (obs.width / GRID_WIDTH) * width,
          (obs.height / GRID_HEIGHT) * height
        );
        ctx.strokeRect(
          (-obs.width / 2 / GRID_WIDTH) * width,
          (-obs.height / 2 / GRID_HEIGHT) * height,
          (obs.width / GRID_WIDTH) * width,
          (obs.height / GRID_HEIGHT) * height
        );
        ctx.restore();
      } else if (obs.type === 'circle' && obs.radius) {
        ctx.beginPath();
        ctx.arc(
          (obs.x / GRID_WIDTH) * width,
          (obs.y / GRID_HEIGHT) * height,
          (obs.radius / GRID_WIDTH) * width,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    }

    for (const source of sources) {
      ctx.fillStyle = source.enabled ? '#00ff88' : '#666666';
      ctx.strokeStyle = source.enabled ? '#00ff88' : '#666666';
      ctx.lineWidth = 2;

      const sx = (source.x / GRID_WIDTH) * width;
      const sy = (source.y / GRID_HEIGHT) * height;

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();

      if (source.enabled) {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(sx, sy, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const warning of warnings) {
      if (warning.location) {
        ctx.fillStyle = warning.severity === 'error' ? '#ff0000' : '#ffaa00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        const wx = (warning.location.x / GRID_WIDTH) * width;
        const wy = (warning.location.y / GRID_HEIGHT) * height;

        ctx.beginPath();
        ctx.moveTo(wx, wy - 12);
        ctx.lineTo(wx + 10, wy + 8);
        ctx.lineTo(wx - 10, wy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', wx, wy + 5);
      }
    }
  }, [waveData, obstacles, sources, warnings, showComparison, baselineWaveData]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      className="w-full h-full border border-gray-700 rounded"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
