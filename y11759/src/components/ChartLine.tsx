import React, { useEffect, useRef } from 'react';

interface Series {
  label: string;
  color: string;
  data: number[];
}

interface ChartLineProps {
  title: string;
  xLabel?: string;
  yLabel?: string;
  series: Series[];
}

const ChartLine: React.FC<ChartLineProps> = ({ title, series }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const padL = 48;
    const padR = 16;
    const padT = 36;
    const padB = 28;
    const cw = W - padL - padR;
    const ch = H - padT - padB;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText(title, padL, 20);

    let minY = Infinity;
    let maxY = -Infinity;
    let maxLen = 0;
    for (const s of series) {
      for (const v of s.data) {
        if (v < minY) minY = v;
        if (v > maxY) maxY = v;
      }
      if (s.data.length > maxLen) maxLen = s.data.length;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const rangeY = maxY - minY;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (ch * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + cw, y);
      ctx.stroke();
      const val = maxY - ((maxY - minY) * i) / 4;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), padL - 6, y + 3);
    }
    ctx.textAlign = 'left';

    for (let si = 0; si < series.length; si++) {
      const s = series[si];
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < s.data.length; i++) {
        const x = padL + (cw * i) / Math.max(1, maxLen - 1);
        const y = padT + ch - (ch * (s.data[i] - minY)) / (maxY - minY);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    let lx = padL;
    for (const s of series) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, H - 16, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px system-ui';
      ctx.fillText(s.label, lx + 12, H - 8);
      lx += ctx.measureText(s.label).width + 24;
    }
  }, [title, series]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={220}
      className="rounded-lg border border-white/10"
    />
  );
};

export default ChartLine;
