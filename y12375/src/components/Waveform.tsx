import React, { useRef, useEffect, useCallback } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { Segment, Issue } from '../types';

interface WaveformProps {
  height?: number;
}

const getSegmentColor = (type: Segment['type']) => {
  switch (type) {
    case 'speech': return 'rgba(0, 212, 255, 0.6)';
    case 'music': return 'rgba(138, 43, 226, 0.6)';
    case 'ad': return 'rgba(255, 107, 53, 0.8)';
    case 'silence': return 'rgba(100, 100, 100, 0.4)';
    default: return 'rgba(0, 212, 255, 0.6)';
  }
};

const getIssueColor = (type: Issue['type']) => {
  switch (type) {
    case 'loudness': return '#ff6b35';
    case 'silence': return '#ffc107';
    case 'sampleRate': return '#00d4ff';
    case 'clipping': return '#ff3366';
    default: return '#ff6b35';
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const Waveform: React.FC<WaveformProps> = ({ height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    selectedAudioFile,
    segments,
    issues,
    currentTime,
    viewStart,
    viewEnd,
    setCurrentTime,
    setSelectedSegment,
    setSelectedIssue,
  } = useAudioStore();

  const getSegmentsInView = useCallback(() => {
    if (!selectedAudioFile) return [];
    return segments.filter(
      (s) => s.audioFileId === selectedAudioFile.id && s.endTime > viewStart && s.startTime < viewEnd
    );
  }, [segments, selectedAudioFile, viewStart, viewEnd]);

  const getIssuesInView = useCallback(() => {
    if (!selectedAudioFile) return [];
    const segmentIds = getSegmentsInView().map((s) => s.id);
    return issues.filter((i) => segmentIds.includes(i.segmentId));
  }, [issues, getSegmentsInView, selectedAudioFile]);

  const timeToX = useCallback(
    (time: number, width: number): number => {
      const viewDuration = viewEnd - viewStart;
      return ((time - viewStart) / viewDuration) * width;
    },
    [viewStart, viewEnd]
  );

  const xToTime = useCallback(
    (x: number, width: number): number => {
      const viewDuration = viewEnd - viewStart;
      return viewStart + (x / width) * viewDuration;
    },
    [viewStart, viewEnd]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !selectedAudioFile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1a1f36';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const waveformData = selectedAudioFile.waveformData;
    const viewDuration = viewEnd - viewStart;
    const startIndex = Math.floor((viewStart / selectedAudioFile.duration) * waveformData.length);
    const endIndex = Math.floor((viewEnd / selectedAudioFile.duration) * waveformData.length);
    const visibleData = waveformData.slice(startIndex, endIndex);

    if (visibleData.length > 0) {
      const samplesPerPixel = Math.max(1, Math.floor(visibleData.length / width));
      
      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      for (let x = 0; x < width; x++) {
        const dataIndex = Math.floor((x / width) * visibleData.length);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < samplesPerPixel && dataIndex + i < visibleData.length; i++) {
          sum += visibleData[dataIndex + i];
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        const barHeight = avg * (height * 0.8);
        const y1 = height / 2 - barHeight;
        const y2 = height / 2 + barHeight;
        
        ctx.lineTo(x, y1);
      }

      for (let x = width - 1; x >= 0; x--) {
        const dataIndex = Math.floor((x / width) * visibleData.length);
        let sum = 0;
        let count = 0;
        for (let i = 0; i < samplesPerPixel && dataIndex + i < visibleData.length; i++) {
          sum += visibleData[dataIndex + i];
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        const barHeight = avg * (height * 0.8);
        const y2 = height / 2 + barHeight;
        
        ctx.lineTo(x, y2);
      }

      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    const segmentsInView = getSegmentsInView();
    segmentsInView.forEach((segment) => {
      const x1 = timeToX(segment.startTime, width);
      const x2 = timeToX(segment.endTime, width);
      const segWidth = x2 - x1;

      ctx.fillStyle = getSegmentColor(segment.type);
      ctx.fillRect(x1, 0, segWidth, height * 0.15);

      if (segment.modifiedBy === 'manual') {
        ctx.strokeStyle = '#00ffa3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x1 + 1, 1, segWidth - 2, height * 0.15 - 2);
        ctx.setLineDash([]);
      }
    });

    const issuesInView = getIssuesInView();
    issuesInView.forEach((issue) => {
      const segment = segments.find((s) => s.id === issue.segmentId);
      if (!segment) return;

      const x1 = timeToX(segment.startTime, width);
      const x2 = timeToX(segment.endTime, width);

      ctx.fillStyle = getIssueColor(issue.type);
      ctx.fillRect(x1, height * 0.85, x2 - x1, height * 0.15);

      if (issue.affectedByManualChange || issue.affectedByAdAddition) {
        ctx.strokeStyle = '#00ffa3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(x1 + 1, height * 0.85 + 1, x2 - x1 - 2, height * 0.15 - 2);
        ctx.setLineDash([]);
      }
    });

    if (currentTime >= viewStart && currentTime <= viewEnd) {
      const playheadX = timeToX(currentTime, width);
      ctx.strokeStyle = '#00ffa3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = '#00ffa3';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 10);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    const timeStep = Math.ceil(viewDuration / 6 / 30) * 30;
    for (let t = Math.ceil(viewStart / timeStep) * timeStep; t <= viewEnd; t += timeStep) {
      const x = timeToX(t, width);
      ctx.fillText(formatTime(t), x + 4, height - 4);
    }
  }, [selectedAudioFile, currentTime, viewStart, viewEnd, height, getSegmentsInView, getIssuesInView, timeToX, segments]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const time = xToTime(x, width);

    setCurrentTime(time);

    const clickedSegment = getSegmentsInView().find(
      (s) => time >= s.startTime && time <= s.endTime
    );
    if (clickedSegment) {
      setSelectedSegment(clickedSegment);
      const relatedIssue = issues.find((i) => i.segmentId === clickedSegment.id);
      if (relatedIssue) {
        setSelectedIssue(relatedIssue);
      }
    }
  };

  if (!selectedAudioFile) {
    return (
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center bg-[#1a1f36] rounded-lg"
        style={{ height }}
      >
        <span className="text-gray-500">请选择音频文件</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full cursor-pointer rounded-lg"
        style={{ height }}
      />
      <div className="absolute top-0 left-0 right-0 flex items-center px-2 py-1 bg-black/50">
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(0, 212, 255, 0.6)' }}></span>
            语音
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255, 107, 53, 0.8)' }}></span>
            广告
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(100, 100, 100, 0.4)' }}></span>
            静音
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border-2 border-dashed" style={{ borderColor: '#00ffa3' }}></span>
            人工修改
          </span>
        </div>
      </div>
    </div>
  );
};
