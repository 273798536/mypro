import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';
import { GridBackground } from './GridBackground';
import { DraggableDevice } from './DraggableDevice';
import { AnnotationTool } from './AnnotationTool';
import { useBatchStore } from '@/stores/useBatchStore';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import type { Device } from '@/types';

interface CanvasProps {
  width: number;
  height: number;
}

const LNG_BOUNDS = { min: 121.47, max: 121.476 };
const LAT_BOUNDS = { min: 31.229, max: 31.2315 };

export function Canvas({ width, height }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const {
    devices,
    layers,
    canvasState,
    setCanvasState,
    currentBatch,
  } = useBatchStore();
  const { activeTool } = useCanvasStore();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useUndoRedo();

  const mapToCanvas = useCallback(
    (lng: number, lat: number) => {
      const x =
        ((lng - LNG_BOUNDS.min) / (LNG_BOUNDS.max - LNG_BOUNDS.min)) *
          (width - 100) +
        50;
      const y =
        height -
        (((lat - LAT_BOUNDS.min) / (LAT_BOUNDS.max - LAT_BOUNDS.min)) *
            (height - 100) +
          50);
      return { x, y };
    },
    [width, height]
  );

  const mapFromCanvas = useCallback(
    (x: number, y: number) => {
      const lng =
        ((x - 50) / (width - 100)) * (LNG_BOUNDS.max - LNG_BOUNDS.min) +
        LNG_BOUNDS.min;
      const lat =
        ((height - y - 50) / (height - 100)) * (LAT_BOUNDS.max - LAT_BOUNDS.min) +
        LAT_BOUNDS.min;
      return { lng, lat };
    },
    [width, height]
  );

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = canvasState.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));

    setCanvasState({
      scale: clampedScale,
    });
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const { lng, lat } = mapFromCanvas(pos.x, pos.y);
    setMousePos({ x: lng, y: lat });

    if (activeTool === 'pan' && e.evt.buttons === 1) {
      const dx = e.evt.movementX;
      const dy = e.evt.movementY;
      setCanvasState({
        offsetX: canvasState.offsetX + dx,
        offsetY: canvasState.offsetY + dy,
      });
    }
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const container = stage.container();
    container.style.cursor =
      activeTool === 'pan' ? 'grab' : activeTool === 'annotate' ? 'crosshair' : 'default';
  }, [activeTool]);

  const visibleDevices = devices.filter((device) => {
    const layer = layers.find((l) => l.id === device.layerId);
    if (!layer || !layer.visible) return false;

    if (layer.filter) {
      const { field, operator, value } = layer.filter;
      const deviceValue = device[field as keyof Device];
      switch (operator) {
        case 'eq':
          return String(deviceValue) === String(value);
        case 'neq':
          return String(deviceValue) !== String(value);
        case 'contains':
          return String(deviceValue).includes(String(value));
        default:
          return true;
      }
    }

    return true;
  });

  const commandInProgress = currentBatch.commands.length > currentBatch.currentIndex + 1;

  return (
    <div className="relative w-full h-full">
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded shadow text-xs font-mono text-gray-600 z-10">
        鼠标坐标: {mousePos.x.toFixed(6)}, {mousePos.y.toFixed(6)}
      </div>

      {commandInProgress && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded text-sm z-10">
          ⚠️ 当前处于撤销位置，新操作将覆盖后续历史记录
        </div>
      )}

      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={canvasState.scale}
        scaleY={canvasState.scale}
        x={canvasState.offsetX}
        y={canvasState.offsetY}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onClick={() => setSelectedDeviceId(null)}
      >
        <Layer>
          <GridBackground width={width} height={height} />
        </Layer>

        {layers
          .filter((l) => l.visible)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => (
            <Layer key={layer.id} id={layer.id}>
              {visibleDevices
                .filter((d) => d.layerId === layer.id)
                .map((device) => (
                  <DraggableDevice
                    key={device.id}
                    device={device}
                    mapToCanvas={mapToCanvas}
                    mapFromCanvas={mapFromCanvas}
                    isSelected={selectedDeviceId === device.id}
                    onSelect={(e?: any) => {
                      e?.cancelBubble?.();
                      setSelectedDeviceId(device.id);
                    }}
                  />
                ))}
            </Layer>
          ))}

        {layers.find((l) => l.id === 'layer-annotations')?.visible && (
          <AnnotationTool mapToCanvas={mapToCanvas} />
        )}
      </Stage>
    </div>
  );
}
