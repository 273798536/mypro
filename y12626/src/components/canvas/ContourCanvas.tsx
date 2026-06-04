import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move, Eye, EyeOff, Magnet, SplitSquareHorizontal, Square } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import ContourLayer from './ContourLayer';
import BoundaryLayer from './BoundaryLayer';
import GridLayer from './GridLayer';
import TrackLayer from './TrackLayer';
import { TrackPoint } from '../../types';

const CANVAS_WIDTH = 680;
const CANVAS_HEIGHT = 520;

const ContourCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mapBounds = useAppStore(state => state.mapBounds);
  const contours = useAppStore(state => state.contours);
  const boundaries = useAppStore(state => state.boundaries);
  const getFilteredPoints = useAppStore(state => state.getFilteredPoints);
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const gridSize = useAppStore(state => state.gridSize);
  const showGrid = useAppStore(state => state.showGrid);
  const showBoundaries = useAppStore(state => state.showBoundaries);
  const showContours = useAppStore(state => state.showContours);
  const snappingEnabled = useAppStore(state => state.snappingEnabled);
  const comparisonMode = useAppStore(state => state.comparisonMode);
  const zoom = useAppStore(state => state.zoom);
  const pan = useAppStore(state => state.pan);
  const setZoom = useAppStore(state => state.setZoom);
  const setPan = useAppStore(state => state.setPan);
  const setShowGrid = useAppStore(state => state.setShowGrid);
  const setShowBoundaries = useAppStore(state => state.setShowBoundaries);
  const setShowContours = useAppStore(state => state.setShowContours);
  const applySnapping = useAppStore(state => state.applySnapping);
  const setComparisonMode = useAppStore(state => state.setComparisonMode);
  const dataVersion = useAppStore(state => state.dataVersion);

  const filteredPoints = getFilteredPoints();

  const handlePointClick = useCallback((point: TrackPoint) => {
    setSelectedPointId(prev => prev === point.id ? null : point.id);
  }, []);

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleToggleSnapping = () => {
    if (snappingEnabled) {
      useAppStore.getState().setSnappingEnabled(false);
    } else {
      useAppStore.getState().setSnappingEnabled(true);
      useAppStore.getState().applySnapping();
    }
  };

  useEffect(() => {
    if (snappingEnabled) {
      useAppStore.getState().applySnapping();
    }
  }, [gridSize, snappingEnabled]);

  const renderCanvas = (showSnapped: boolean, title: string) => (
    <div className="flex flex-col">
      <div className="bg-xuan-100 border-b border-ochre-300 px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-serif text-ochre-700">{title}</span>
        {showSnapped && snappingEnabled && (
          <span className="text-xs text-azure-600 flex items-center gap-1">
            <Magnet className="w-3 h-3" />
            已吸附至 {gridSize}m 网格
          </span>
        )}
      </div>
      <svg
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-xuan-50 border border-ochre-300"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <filter id="paperTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#FAF6EE" surfaceScale="2">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
          </filter>
        </defs>
        
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {showContours && (
            <ContourLayer
              contours={contours}
              bounds={mapBounds}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          )}
          {showGrid && (
            <GridLayer
              bounds={mapBounds}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              gridSize={gridSize}
              visible={showGrid}
            />
          )}
          {showBoundaries && (
            <BoundaryLayer
              boundaries={boundaries}
              bounds={mapBounds}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
            />
          )}
          <TrackLayer
            points={filteredPoints}
            bounds={mapBounds}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            selectedPointId={selectedPointId}
            onPointClick={handlePointClick}
            showSnapped={showSnapped}
            materials={sourceMaterials}
          />
        </g>
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between bg-xuan-100 border border-ochre-300 rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-serif text-ink-600">视图控制</span>
          <div className="h-4 w-px bg-ochre-300 mx-2" />
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-ochre-100 text-ochre-700"
            title="放大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-ochre-100 text-ochre-700"
            title="缩小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded hover:bg-ochre-100 text-ochre-700"
            title="重置视图"
          >
            <Move className="w-4 h-4" />
          </button>
          <span className="text-xs text-ochre-600 ml-2">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-px bg-ochre-300 mx-1" />
          
          <button
            onClick={() => setShowContours(!showContours)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showContours ? 'bg-ochre-100 text-ochre-700' : 'text-ochre-500 hover:bg-ochre-50'
            }`}
          >
            {showContours ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            等高线
          </button>
          
          <button
            onClick={() => setShowBoundaries(!showBoundaries)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showBoundaries ? 'bg-ochre-100 text-ochre-700' : 'text-ochre-500 hover:bg-ochre-50'
            }`}
          >
            {showBoundaries ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            边界
          </button>
          
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showGrid ? 'bg-ochre-100 text-ochre-700' : 'text-ochre-500 hover:bg-ochre-50'
            }`}
          >
            {showGrid ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            网格
          </button>

          <div className="h-4 w-px bg-ochre-300 mx-1" />

          <button
            onClick={handleToggleSnapping}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              snappingEnabled ? 'bg-azure-100 text-azure-700' : 'text-ochre-500 hover:bg-ochre-50'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            网格吸附
          </button>
          
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              comparisonMode ? 'bg-rattan-100 text-rattan-700' : 'text-ochre-500 hover:bg-ochre-50'
            }`}
          >
            {comparisonMode ? <SplitSquareHorizontal className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {comparisonMode ? '对比模式' : '单视图'}
          </button>
        </div>
      </div>

      <div ref={canvasRef} className="flex gap-4">
        {comparisonMode ? (
          <>
            {renderCanvas(false, '原始坐标')}
            {renderCanvas(true, '吸附后坐标')}
          </>
        ) : (
          renderCanvas(snappingEnabled, snappingEnabled ? '吸附后视图' : '原始视图')
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-ochre-600 bg-xuan-100 border border-ochre-200 rounded px-3 py-2">
        <div className="flex items-center gap-4">
          <span>总点数：{filteredPoints.length}</span>
          <span>数据版本：v{dataVersion}</span>
          {snappingEnabled && (
            <span className="text-azure-600">
              网格尺寸：{gridSize}m × {gridSize}m
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-azure-500" /> 正常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-cinnabar-500" /> 边界越界
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-rattan-500" /> 颜色异常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-ochre-400" /> 缺项漏填
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-ochre-300" /> 补录数据
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContourCanvas;
