import { useRef, useEffect } from 'react';
import { Note, VoicePart } from '../../types';
import { useGameStore } from '../../store/useGameStore';

interface VoiceTrackProps {
  part: VoicePart;
  trackHeight: number;
  pixelsPerSecond: number;
}

export function VoiceTrack({ part, trackHeight, pixelsPerSecond }: VoiceTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTime, judgedNoteIds, judgeRecords, status, userVolumes } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width * 0.7;
    const viewDuration = width / pixelsPerSecond * 1000;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(30, 41, 59, 0.8)');
    gradient.addColorStop(0.5, 'rgba(51, 65, 85, 0.6)');
    gradient.addColorStop(1, 'rgba(30, 41, 59, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    part.notes.forEach((note: Note) => {
      const noteStartX = centerX + (note.time - currentTime) * pixelsPerSecond / 1000;
      const noteEndX = noteStartX + note.duration * pixelsPerSecond / 1000;

      if (noteEndX < 0 || noteStartX > width) return;

      const isJudged = judgedNoteIds.has(note.id);
      const judgeRecord = judgeRecords.find(r => r.noteId === note.id);
      
      const noteY = height / 2;
      const noteHeight = height * 0.4;

      ctx.save();
      
      if (isJudged && judgeRecord) {
        switch (judgeRecord.result) {
          case 'perfect':
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            break;
          case 'early':
            ctx.shadowColor = '#f87171';
            ctx.shadowBlur = 15;
            break;
          case 'late':
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            break;
          case 'missed':
            ctx.shadowColor = '#6b7280';
            ctx.shadowBlur = 5;
            break;
        }
      }

      const noteGradient = ctx.createLinearGradient(noteStartX, noteY - noteHeight / 2, noteStartX, noteY + noteHeight / 2);
      if (isJudged && judgeRecord) {
        switch (judgeRecord.result) {
          case 'perfect':
            noteGradient.addColorStop(0, '#fbbf24');
            noteGradient.addColorStop(0.5, '#f59e0b');
            noteGradient.addColorStop(1, '#fbbf24');
            break;
          case 'early':
            noteGradient.addColorStop(0, '#f87171');
            noteGradient.addColorStop(0.5, '#ef4444');
            noteGradient.addColorStop(1, '#f87171');
            break;
          case 'late':
            noteGradient.addColorStop(0, '#fbbf24');
            noteGradient.addColorStop(0.5, '#f59e0b');
            noteGradient.addColorStop(1, '#fbbf24');
            break;
          case 'missed':
            noteGradient.addColorStop(0, '#6b7280');
            noteGradient.addColorStop(0.5, '#4b5563');
            noteGradient.addColorStop(1, '#6b7280');
            break;
        }
      } else {
        noteGradient.addColorStop(0, part.color + '40');
        noteGradient.addColorStop(0.5, part.color);
        noteGradient.addColorStop(1, part.color + '40');
      }

      const radius = 8;
      const x = Math.max(noteStartX, 0);
      const w = Math.min(noteEndX - noteStartX, width - x);
      
      ctx.beginPath();
      ctx.roundRect(x, noteY - noteHeight / 2, Math.max(w, radius * 2), noteHeight, radius);
      ctx.fillStyle = noteGradient;
      ctx.fill();

      if (!isJudged && Math.abs(note.time - currentTime) < 500) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();

      if (noteEndX - noteStartX > 40) {
        ctx.fillStyle = isJudged ? '#ffffff' : '#ffffff88';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note.pitch, noteStartX + (noteEndX - noteStartX) / 2, noteY);
      }
    });

    ctx.save();
    ctx.strokeStyle = part.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = part.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const timeGradient = ctx.createRadialGradient(centerX, height / 2, 0, centerX, height / 2, 100);
    timeGradient.addColorStop(0, part.color + '30');
    timeGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = timeGradient;
    ctx.fillRect(centerX - 100, 0, 200, height);
    ctx.restore();

  }, [currentTime, part, pixelsPerSecond, judgedNoteIds, judgeRecords, status, userVolumes]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden border border-slate-600/50"
      style={{ height: trackHeight }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="absolute left-0 top-0 bottom-0 flex items-center px-3 bg-gradient-to-r from-slate-900/90 to-transparent pointer-events-none">
        <span 
          className="font-bold text-sm"
          style={{ color: part.color, textShadow: `0 0 10px ${part.color}40` }}
        >
          {part.name}
        </span>
      </div>
    </div>
  );
}
