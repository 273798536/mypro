import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ViewState } from '../../types';

interface ImageCanvasProps {
  imageData: string;
  viewState: ViewState;
  onViewStateChange: (state: ViewState) => void;
  onCanvasClick: (x: number, y: number) => void;
  isAnnotateMode: boolean;
  children?: React.ReactNode;
}

export function ImageCanvas({
  imageData,
  viewState,
  onViewStateChange,
  onCanvasClick,
  isAnnotateMode,
  children,
}: ImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 500, height: 400 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = imageData;
  }, [imageData]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(5, viewState.zoom + delta));
      onViewStateChange({ ...viewState, zoom: newZoom });
    },
    [viewState, onViewStateChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isAnnotateMode) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - viewState.panX) / viewState.zoom;
        const y = (e.clientY - rect.top - viewState.panY) / viewState.zoom;

        if (x >= 0 && x <= imageSize.width && y >= 0 && y <= imageSize.height) {
          onCanvasClick(x, y);
        }
      } else {
        setIsDragging(true);
      }
    },
    [isAnnotateMode, viewState, imageSize, onCanvasClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && !isAnnotateMode) {
        onViewStateChange({
          ...viewState,
          panX: viewState.panX + e.movementX,
          panY: viewState.panY + e.movementY,
        });
      }
    },
    [isDragging, isAnnotateMode, viewState, onViewStateChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-900 rounded-lg"
      style={{ cursor: isAnnotateMode ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${viewState.panX}px, ${viewState.panY}px) scale(${viewState.zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <img
          ref={imageRef}
          src={imageData}
          alt="显微图像"
          className="select-none pointer-events-none"
          draggable={false}
        />
        <div className="absolute inset-0">{children}</div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-mono">
        缩放: {(viewState.zoom * 100).toFixed(0)}% | 平移: ({viewState.panX.toFixed(0)}, {viewState.panY.toFixed(0)})
      </div>

      {isAnnotateMode && (
        <div className="absolute top-4 left-4 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
          标注模式：点击图像添加异常标记
        </div>
      )}
    </div>
  );
}
