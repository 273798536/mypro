import React, { useEffect, useRef } from 'react';
import { SimulationEvent, SimulationConfig } from '../../types';

interface SimulationVisualizationProps {
  events: SimulationEvent[];
  config: SimulationConfig;
  currentTime: number;
  isRunning: boolean;
  windowCount: number;
}

const SimulationVisualization: React.FC<SimulationVisualizationProps> = ({
  events,
  config,
  currentTime,
  isRunning,
  windowCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const windowHeight = (height - padding * 2) / (windowCount + 1);
    const queueY = height - padding - windowHeight / 2;

    const currentEvents = events.filter((e) => e.time <= currentTime);
    const arrivals = currentEvents.filter((e) => e.type === 'arrival').length;
    const starts = currentEvents.filter((e) => e.type === 'start_service').length;
    const ends = currentEvents.filter((e) => e.type === 'end_service').length;

    const queueLength = Math.max(0, arrivals - starts);
    const serving = starts - ends;

    const windowStates = Array(windowCount).fill(0).map(() => ({ busy: false, progress: 0 }));

    let serveCounter = 0;
    let endCounter = 0;
    currentEvents.forEach((event) => {
      if (event.type === 'start_service' && event.windowId !== undefined) {
        windowStates[event.windowId].busy = true;
        windowStates[event.windowId].progress = 0.3;
        serveCounter++;
      }
      if (event.type === 'end_service' && event.windowId !== undefined) {
        windowStates[event.windowId].busy = false;
        windowStates[event.windowId].progress = 0;
        endCounter++;
      }
    });

    const activeServices = serveCounter - endCounter;
    for (let i = 0; i < windowCount && i < activeServices; i++) {
      windowStates[i].busy = true;
      windowStates[i].progress = 0.3 + Math.random() * 0.4;
    }

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#E5E6EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= windowCount; i++) {
      const y = padding + i * windowHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.fillStyle = '#4E5969';
    ctx.textAlign = 'right';
    ctx.fillText('排队区', padding - 10, queueY + 4);
    for (let i = 0; i < windowCount; i++) {
      const y = padding + i * windowHeight + windowHeight / 2 + 4;
      ctx.fillText(`窗口${i + 1}`, padding - 10, y);
    }

    const queueStartX = padding + 20;
    const personSize = 24;
    const personGap = 8;
    const maxQueueVisible = Math.floor((width - padding * 2 - 40) / (personSize + personGap));

    const displayQueue = Math.min(queueLength, maxQueueVisible);
    for (let i = 0; i < displayQueue; i++) {
      const x = queueStartX + i * (personSize + personGap);
      const y = queueY - personSize / 2;

      const gradient = ctx.createRadialGradient(
        x + personSize / 2,
        y + personSize / 2,
        0,
        x + personSize / 2,
        y + personSize / 2,
        personSize / 2
      );
      gradient.addColorStop(0, '#6AA1FF');
      gradient.addColorStop(1, '#165DFF');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x + personSize / 2, y + personSize / 2, personSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${queueLength - i}`, x + personSize / 2, y + personSize / 2 + 3);
    }

    if (queueLength > maxQueueVisible) {
      const x = queueStartX + maxQueueVisible * (personSize + personGap);
      ctx.fillStyle = '#86909C';
      ctx.font = '12px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`+${queueLength - maxQueueVisible} 人`, x, queueY + 4);
    }

    for (let i = 0; i < windowCount; i++) {
      const windowY = padding + i * windowHeight + windowHeight / 2;
      const windowX = padding + 20;
      const windowWidth = 60;
      const windowHeightBox = windowHeight * 0.6;

      const state = windowStates[i];

      ctx.fillStyle = state.busy ? '#165DFF' : '#E5E6EB';
      ctx.strokeStyle = state.busy ? '#0E42D2' : '#C9CDD4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(windowX, windowY - windowHeightBox / 2, windowWidth, windowHeightBox, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = state.busy ? '#fff' : '#4E5969';
      ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.busy ? '办理中' : '空闲', windowX + windowWidth / 2, windowY + 5);

      if (state.busy) {
        const progressWidth = 80;
        const progressX = windowX + windowWidth + 15;
        const progressY = windowY - 4;
        const progressHeight = 8;

        ctx.fillStyle = '#E5E6EB';
        ctx.beginPath();
        ctx.roundRect(progressX, progressY, progressWidth, progressHeight, 4);
        ctx.fill();

        const progressGradient = ctx.createLinearGradient(progressX, 0, progressX + progressWidth, 0);
        progressGradient.addColorStop(0, '#00B42A');
        progressGradient.addColorStop(1, '#58D268');

        ctx.fillStyle = progressGradient;
        ctx.beginPath();
        ctx.roundRect(progressX, progressY, progressWidth * state.progress, progressHeight, 4);
        ctx.fill();

        ctx.fillStyle = '#4E5969';
        ctx.font = '11px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `${Math.round(state.progress * 100)}%`,
          progressX + progressWidth + 8,
          progressY + 7
        );
      }
    }

    const statusY = 20;
    ctx.fillStyle = '#1D2129';
    ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`模拟时间: ${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`, padding, statusY);

    const stats = [
      { label: '排队人数', value: queueLength, color: '#FF7D00' },
      { label: '办理中', value: serving, color: '#165DFF' },
      { label: '已完成', value: ends, color: '#00B42A' },
    ];

    let statX = width - padding;
    stats.forEach((stat) => {
      ctx.fillStyle = stat.color;
      ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'right';
      const text = `${stat.value}`;
      ctx.fillText(text, statX, statusY);

      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = '#4E5969';
      ctx.font = '11px "Noto Sans SC", sans-serif';
      ctx.fillText(stat.label, statX - textWidth - 8, statusY);

      statX -= textWidth + 8 + ctx.measureText(stat.label).width + 20;
    });

    if (isRunning) {
      animationRef.current = requestAnimationFrame(() => {
      });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [events, currentTime, windowCount, isRunning]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-800">排队过程可视化</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary-500"></span>
            <span className="text-neutral-600">办理中</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-neutral-300"></span>
            <span className="text-neutral-600">空闲</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-warning-500"></span>
            <span className="text-neutral-600">排队中</span>
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={400}
        className="w-full border border-neutral-200 rounded-lg"
      />
    </div>
  );
};

export default SimulationVisualization;
