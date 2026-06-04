import React, { useState, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Move,
  PlusCircle,
  RotateCcw,
  Download,
  Maximize2,
} from 'lucide-react';
import { ImageCanvas } from './ImageCanvas';
import { AnomalyMarker } from './AnomalyMarker';
import type { ViewState, Anomaly as AnomalyType } from '../../types';

interface ImageViewerProps {
  src: string;
  alt: string;
  anomalies: AnomalyType[];
  selectedAnomalyId?: string | null;
  mode?: 'browse' | 'annotate';
  initialZoom?: number;
  initialPanX?: number;
  initialPanY?: number;
  onImageClick?: (x: number, y: number) => void;
  onAnomalyClick?: (anomaly: AnomalyType) => void;
  onTransformChange?: (zoom: number, panX: number, panY: number) => void;
}

export function ImageViewer({
  src,
  alt,
  anomalies,
  selectedAnomalyId = null,
  mode = 'browse',
  initialZoom = 1,
  initialPanX = 0,
  initialPanY = 0,
  onImageClick,
  onAnomalyClick,
  onTransformChange,
}: ImageViewerProps) {
  const [viewState, setViewState] = useState<ViewState>({
    zoom: initialZoom,
    panX: initialPanX,
    panY: initialPanY,
  });
  const [isAnnotateMode, setIsAnnotateMode] = useState(mode === 'annotate');
  const [selectedId, setSelectedId] = useState<string | null>(selectedAnomalyId);
  const [imageSize, setImageSize] = useState({ width: 500, height: 400 });

  useEffect(() => {
    setViewState({
      zoom: initialZoom,
      panX: initialPanX,
      panY: initialPanY,
    });
  }, [initialZoom, initialPanX, initialPanY]);

  useEffect(() => {
    setIsAnnotateMode(mode === 'annotate');
  }, [mode]);

  useEffect(() => {
    setSelectedId(selectedAnomalyId);
  }, [selectedAnomalyId]);

  useEffect(() => {
    if (src) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = src;
    }
  }, [src]);

  const handleViewStateChange = useCallback(
    (newState: ViewState) => {
      setViewState(newState);
      onTransformChange?.(newState.zoom, newState.panX, newState.panY);
    },
    [onTransformChange]
  );

  const handleCanvasClick = useCallback(
    (x: number, y: number) => {
      if (!isAnnotateMode) return;
      onImageClick?.(x, y);
    },
    [isAnnotateMode, onImageClick]
  );

  const handleZoomIn = () => {
    handleViewStateChange({
      ...viewState,
      zoom: Math.min(5, viewState.zoom + 0.2),
    });
  };

  const handleZoomOut = () => {
    handleViewStateChange({
      ...viewState,
      zoom: Math.max(0.1, viewState.zoom - 0.2),
    });
  };

  const handleReset = () => {
    handleViewStateChange({ zoom: 1, panX: 0, panY: 0 });
  };

  const handleFitScreen = () => {
    if (!src) return;
    const container = document.querySelector('.image-viewer-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scaleX = (containerRect.width - 40) / imageSize.width;
    const scaleY = (containerRect.height - 100) / imageSize.height;
    const scale = Math.min(scaleX, scaleY, 1);

    handleViewStateChange({ zoom: scale, panX: 0, panY: 0 });
  };

  const handleDownload = () => {
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = alt || 'image.png';
    a.click();
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAnnotateMode(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isAnnotateMode
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Move className="w-4 h-4" />
            浏览
          </button>
          <button
            onClick={() => setIsAnnotateMode(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAnnotateMode
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            标注
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          <span className="px-3 text-sm text-gray-600 font-mono min-w-[60px] text-center">
            {(viewState.zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="放大"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={handleReset}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="重置视图"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleFitScreen}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="适应屏幕"
          >
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="下载原图"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="image-viewer-container flex-1 min-h-0 bg-slate-900 rounded-xl overflow-hidden">
        <ImageCanvas
          imageData={src || ''}
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          onCanvasClick={handleCanvasClick}
          isAnnotateMode={isAnnotateMode}
        >
          {anomalies.map((anomaly) => (
            <AnomalyMarker
              key={anomaly.id}
              anomaly={anomaly}
              zoom={viewState.zoom}
              panX={viewState.panX}
              panY={viewState.panY}
              imageWidth={imageSize.width}
              imageHeight={imageSize.height}
              selected={anomaly.id === selectedId}
              onSelect={() => {
                setSelectedId(anomaly.id);
                onAnomalyClick?.(anomaly);
              }}
            />
          ))}
        </ImageCanvas>
      </div>
    </div>
  );
}
