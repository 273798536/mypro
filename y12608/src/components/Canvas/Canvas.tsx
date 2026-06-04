import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import { AnnotationType, Point, ToolType } from '../../types';
import { screenToCanvas } from '../../utils/coordinate';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  
  const {
    tracks,
    annotations,
    zoom,
    pan,
    currentTool,
    selectedTrackId,
    selectedAnnotationId,
    setZoom,
    setPan,
    selectTrack,
    selectAnnotation,
    addAnnotation
  } = useCanvasStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20 * zoom;
    
    for (let x = pan.x % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = pan.y % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(22, 93, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      pan.x + 0.05 * width * zoom,
      pan.y + 0.05 * height * zoom,
      0.9 * width * zoom,
      0.9 * height * zoom
    );

    tracks.forEach(track => {
      if (!track.visible || track.points.length < 2) return;
      
      const isSelected = track.id === selectedTrackId;
      
      ctx.strokeStyle = isSelected ? '#ffffff' : track.color;
      ctx.lineWidth = isSelected ? 4 : 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      track.points.forEach((point, index) => {
        const x = pan.x + point.x * width * zoom;
        const y = pan.y + point.y * height * zoom;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      if (track.points.length > 0) {
        const startPoint = track.points[0];
        const endPoint = track.points[track.points.length - 1];
        
        ctx.fillStyle = track.color;
        ctx.beginPath();
        ctx.arc(
          pan.x + startPoint.x * width * zoom,
          pan.y + startPoint.y * height * zoom,
          6,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
          pan.x + endPoint.x * width * zoom,
          pan.y + endPoint.y * height * zoom,
          5,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    annotations.forEach(annotation => {
      const x = pan.x + annotation.x * width * zoom;
      const y = pan.y + annotation.y * height * zoom;
      const isSelected = annotation.id === selectedAnnotationId;
      
      const colors = {
        normal: '#00B42A',
        abnormal: '#FF7D00',
        pending: '#FFC53D'
      };
      
      const color = colors[annotation.type];
      const size = isSelected ? 14 : 10;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      gradient.addColorStop(0, color + '80');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icons = { normal: '✓', abnormal: '!', pending: '?' };
      ctx.fillText(icons[annotation.type], x, y);
      
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [tracks, annotations, zoom, pan, selectedTrackId, selectedAnnotationId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasPoint = screenToCanvas(e.clientX, e.clientY, rect, 1, { x: 0, y: 0 });
    
    if (currentTool === 'pan') {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
    } else if (currentTool === 'select') {
      handleSelect(canvasPoint);
    } else if (currentTool.startsWith('annotate-')) {
      handleAddAnnotation(canvasPoint, currentTool);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || currentTool !== 'pan') return;
    
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    
    setPan({ x: pan.x + dx, y: pan.y + dy });
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(zoom * delta);
  };

  const handleSelect = (point: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    const clickX = (point.x - pan.x) / (width * zoom);
    const clickY = (point.y - pan.y) / (height * zoom);
    
    let found = false;
    
    for (const annotation of annotations) {
      const dist = Math.sqrt(
        Math.pow(annotation.x - clickX, 2) + Math.pow(annotation.y - clickY, 2)
      );
      if (dist < 0.02) {
        selectAnnotation(annotation.id);
        found = true;
        break;
      }
    }
    
    if (!found) {
      for (const track of tracks) {
        for (const tp of track.points) {
          const dist = Math.sqrt(
            Math.pow(tp.x - clickX, 2) + Math.pow(tp.y - clickY, 2)
          );
          if (dist < 0.02) {
            selectTrack(track.id);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    
    if (!found) {
      selectTrack(null);
      selectAnnotation(null);
    }
  };

  const handleAddAnnotation = (point: Point, tool: ToolType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    const x = (point.x - pan.x) / (width * zoom);
    const y = (point.y - pan.y) / (height * zoom);
    
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    
    let nearestTrackId: string | null = null;
    let minDist = Infinity;
    
    for (const track of tracks) {
      for (const tp of track.points) {
        const dist = Math.sqrt(Math.pow(tp.x - x, 2) + Math.pow(tp.y - y, 2));
        if (dist < minDist) {
          minDist = dist;
          nearestTrackId = track.id;
        }
      }
    }
    
    const type = tool.replace('annotate-', '') as AnnotationType;
    
    addAnnotation({
      trackId: nearestTrackId || '',
      x,
      y,
      type,
      status: 'draft',
      note: ''
    });
  };

  const getCursor = () => {
    switch (currentTool) {
      case 'pan': return isDragging ? 'grabbing' : 'grab';
      case 'select': return 'pointer';
      default: return 'crosshair';
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        <span className="text-white/70 text-sm">缩放: {Math.round(zoom * 100)}%</span>
      </div>
      
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        <span className="text-white/70 text-sm">
          工具: {
            currentTool === 'select' ? '选择' :
            currentTool === 'pan' ? '平移' :
            currentTool === 'annotate-normal' ? '标注正常' :
            currentTool === 'annotate-abnormal' ? '标注异常' :
            '标注待确认'
          }
        </span>
      </div>
    </div>
  );
}
