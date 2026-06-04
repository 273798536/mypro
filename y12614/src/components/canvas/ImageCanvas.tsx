import { useEffect, useRef, useCallback, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useSelectionStore } from '@/store/useSelectionStore';
import { DetectionService, type Polygon } from '@/services/detectionService';
import { CoordinateService } from '@/services/coordinateService';
import type { Point, Sample } from '@/types';
import { cn } from '@/lib/utils';

interface ImageCanvasProps {
  sample: Sample | null;
}

export function ImageCanvas({ sample }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, pan, tool, currentPoints, isDrawing, imageLoaded, imageSize,
    setZoom, setPan, setImageLoaded, setImageSize, addPoint,
    setCurrentPoints, setIsDrawing } = useCanvasStore();
  const { selections, addSelection, updateSelection, currentSelectionId } = useSelectionStore();
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const leafBoundary: Polygon = {
    points: [
      { x: 150, y: 100 },
      { x: 550, y: 120 },
      { x: 650, y: 300 },
      { x: 550, y: 480 },
      { x: 150, y: 500 },
      { x: 50, y: 300 }
    ]
  };

  const validColorBounds = {
    minX: 100, maxX: 600, minY: 80, maxY: 520
  };

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const screenToImageCoords = useCallback((screenPoint: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return screenPoint;
    
    const imageOffset = CoordinateService.getImageOffset(
      canvas.width, canvas.height, imageSize.width, imageSize.height, zoom
    );
    
    return CoordinateService.screenToImage(
      screenPoint, zoom, pan, { x: 0, y: 0 }, imageOffset
    );
  }, [zoom, pan, imageSize]);

  const imageToScreenCoords = useCallback((imagePoint: Point): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return imagePoint;
    
    const imageOffset = CoordinateService.getImageOffset(
      canvas.width, canvas.height, imageSize.width, imageSize.height, zoom
    );
    
    return CoordinateService.imageToScreen(
      imagePoint, zoom, pan, { x: 0, y: 0 }, imageOffset
    );
  }, [zoom, pan, imageSize]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning || tool === 'none') return;
    
    const screenPoint = getCanvasPoint(e);
    const imagePoint = screenToImageCoords(screenPoint);
    
    if (tool === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([imagePoint]);
      } else {
        addPoint(imagePoint);
      }
    }
  }, [isPanning, tool, isDrawing, getCanvasPoint, screenToImageCoords, setIsDrawing, setCurrentPoints, addPoint]);

  const handleDoubleClick = useCallback(() => {
    if (tool === 'polygon' && isDrawing && currentPoints.length >= 3) {
      const color = '#E07A5F';
      const { isOutOfBounds } = DetectionService.checkColorBoundary(currentPoints, validColorBounds);
      const { isColliding } = DetectionService.checkEdgeCollision(currentPoints, leafBoundary);
      
      const result = DetectionService.generateDetectionResult(isOutOfBounds, isColliding);
      
      addSelection(sample?.id || '', currentPoints, color);
      
      const newSelectionId = selections.length > 0 
        ? `selection-${Date.now()}` 
        : currentSelectionId;
      
      if (newSelectionId) {
        updateSelection(newSelectionId, {
          isOutOfBounds,
          isColliding,
          detectionResult: result.passed ? 'pass' : 'fail'
        });
      }
      
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  }, [tool, isDrawing, currentPoints, sample, addSelection, selections.length, currentSelectionId, updateSelection, setIsDrawing, setCurrentPoints]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const screenPoint = getCanvasPoint(e);
    
    if (isPanning && panStart) {
      const dx = screenPoint.x - panStart.x;
      const dy = screenPoint.y - panStart.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      setPanStart(screenPoint);
      return;
    }
    
    const imagePoint = screenToImageCoords(screenPoint);
    setHoverPoint(imagePoint);
  }, [isPanning, panStart, getCanvasPoint, setPan, pan, screenToImageCoords]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart(getCanvasPoint(e));
    }
  }, [getCanvasPoint]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(zoom + delta);
  }, [zoom, setZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sample) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageLoaded(true);
      setImageSize(img.width, img.height);
    };
    img.src = sample.imageUrl;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageLoaded && imageSize.width > 0) {
      ctx.save();
      
      const imageOffset = CoordinateService.getImageOffset(
        canvas.width, canvas.height, imageSize.width, imageSize.height, zoom
      );
      
      ctx.translate(pan.x + imageOffset.x, pan.y + imageOffset.y);
      ctx.scale(zoom, zoom);
      
      ctx.drawImage(img, 0, 0);

      ctx.strokeStyle = 'rgba(45, 90, 39, 0.3)';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.beginPath();
      leafBoundary.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.stroke();

      selections.forEach((selection) => {
        if (selection.points.length >= 2) {
          ctx.strokeStyle = selection.detectionResult === 'pass' ? '#81B29A' : '#E07A5F';
          ctx.lineWidth = 3 / zoom;
          ctx.setLineDash([]);
          ctx.beginPath();
          selection.points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.closePath();
          ctx.stroke();
          
          ctx.fillStyle = selection.detectionResult === 'pass' 
            ? 'rgba(129, 178, 154, 0.2)' 
            : 'rgba(224, 122, 95, 0.2)';
          ctx.fill();
        }
      });

      if (isDrawing && currentPoints.length > 0) {
        ctx.strokeStyle = '#3D405B';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([]);
        ctx.beginPath();
        currentPoints.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        
        if (hoverPoint && currentPoints.length > 0) {
          ctx.lineTo(hoverPoint.x, hoverPoint.y);
        }
        ctx.stroke();

        currentPoints.forEach((point) => {
          ctx.fillStyle = '#3D405B';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4 / zoom, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();
    }

    if (hoverPoint && imageLoaded) {
      const screenPoint = imageToScreenCoords(hoverPoint);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(screenPoint.x + 15, screenPoint.y - 25, 120, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`X: ${Math.round(hoverPoint.x)}, Y: ${Math.round(hoverPoint.y)}`, screenPoint.x + 20, screenPoint.y - 10);
    }
  }, [sample, zoom, pan, imageLoaded, imageSize, currentPoints, isDrawing, selections, hoverPoint, leafBoundary, setImageLoaded, setImageSize, imageToScreenCoords]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = () => setZoom(zoom + 0.2);
  const handleZoomOut = () => setZoom(zoom - 0.2);
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">缩放: {Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="重置视图"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            tool === 'none' ? 'bg-gray-200' : 'bg-[#2D5A27] text-white'
          )}>
            <Move className="w-3 h-3" />
            <span>{tool === 'none' ? '平移模式' : '绘图模式'}</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-gray-100">
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0 cursor-crosshair',
            isPanning && 'cursor-grabbing',
            tool === 'none' && 'cursor-grab'
          )}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {!sample && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">请先选择一个样例</p>
              <p className="text-sm mt-1">在左侧面板中选择训练样例开始圈选</p>
            </div>
          </div>
        )}

        {sample && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">加载图像中...</div>
          </div>
        )}
      </div>
    </div>
  );
}
