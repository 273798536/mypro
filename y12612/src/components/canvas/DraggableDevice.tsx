import { useRef, useEffect } from 'react';
import { Group, Circle, Text, Rect, Tag, Label } from 'react-konva';
import Konva from 'konva';
import type { Device } from '@/types';
import { getDeviceTypeLabel, getRiskLevelColor, snapToGrid } from '@/utils/helpers';
import { useBatchStore } from '@/stores/useBatchStore';
import { useCanvasStore } from '@/stores/useCanvasStore';

interface DraggableDeviceProps {
  device: Device;
  mapToCanvas: (lng: number, lat: number) => { x: number; y: number };
  mapFromCanvas: (x: number, y: number) => { lng: number; lat: number };
  isSelected: boolean;
  onSelect: () => void;
}

const DEVICE_ICONS: Record<string, string> = {
  crane: '🏗️',
  scaffold: '🔧',
  fire_extinguisher: '🧯',
  electrical: '⚡',
};

export function DraggableDevice({
  device,
  mapToCanvas,
  mapFromCanvas,
  isSelected,
  onSelect,
}: DraggableDeviceProps) {
  const groupRef = useRef<Konva.Group>(null);
  const { executeCommand, highlightedCommandId, currentBatch } = useBatchStore();
  const { activeTool, openAnnotationDialog } = useCanvasStore();

  const pos = mapToCanvas(device.x, device.y);
  const riskColor = getRiskLevelColor(device.riskLevel);

  const isHighlighted = currentBatch.commands.some(
    (c) =>
      c.id === highlightedCommandId &&
      (c.payload as Record<string, unknown>).deviceId === device.id
  );

  const isDraggable = activeTool === 'select' || activeTool === 'drag';

  useEffect(() => {
    if (isHighlighted && groupRef.current) {
      groupRef.current.to({
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 0.3,
        easing: (t: number) => t,
        onFinish: () => {
          groupRef.current?.to({
            scaleX: 1,
            scaleY: 1,
            duration: 0.3,
            easing: (t: number) => t,
          });
        },
      });
    }
  }, [isHighlighted]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    const newX = snapToGrid(target.x());
    const newY = snapToGrid(target.y());
    target.position({ x: newX, y: newY });

    const { lng, lat } = mapFromCanvas(newX, newY);

    executeCommand({
      type: 'device_drag',
      description: `移动${device.name}到新位置`,
      payload: {
        deviceId: device.id,
        oldX: device.x,
        oldY: device.y,
        newX: lng,
        newY: lat,
      },
      getPreviousState: () => ({
        deviceId: device.id,
        oldX: lng,
        oldY: lat,
        newX: device.x,
        newY: device.y,
      }),
      applyState: () => {},
    });
  };

  const handleDblClick = () => {
    openAnnotationDialog(device.id);
  };

  return (
    <Group
      ref={groupRef}
      x={pos.x}
      y={pos.y}
      draggable={isDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragEnd={handleDragEnd}
    >
      {isSelected && (
        <Circle
          x={0}
          y={0}
          radius={28}
          stroke="#1e3a5f"
          strokeWidth={3}
          dash={[5, 3]}
        />
      )}

      {device.coordinateFlip && !device.coordinateFlip.userConfirmed && (
        <Label x={-35} y={-45}>
          <Tag
            fill="#fef3c7"
            stroke="#f59e0b"
            strokeWidth={1}
            cornerRadius={3}
          />
          <Text text="⚠️ 坐标异常" fontSize={10} padding={3} fill="#92400e" />
        </Label>
      )}

      <Circle
        x={0}
        y={0}
        radius={22}
        fill={riskColor}
        opacity={0.2}
        shadowColor={riskColor}
        shadowBlur={isHighlighted ? 20 : 10}
        shadowOpacity={0.5}
      />

      <Circle x={0} y={0} radius={18} fill="white" stroke={riskColor} strokeWidth={2} />

      <Text
        x={-12}
        y={-12}
        text={DEVICE_ICONS[device.type] || '📍'}
        fontSize={22}
      />

      <Text
        x={-30}
        y={25}
        text={device.name}
        fontSize={11}
        width={60}
        align="center"
        fill="#2d3748"
        fontStyle="bold"
      />

      <Text
        x={-40}
        y={38}
        text={`${getDeviceTypeLabel(device.type)}`}
        fontSize={9}
        width={80}
        align="center"
        fill="#718096"
      />

      <Rect
        x={-40}
        y={-30}
        width={80}
        height={75}
        fill="transparent"
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = isDraggable ? 'move' : 'pointer';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
      />
    </Group>
  );
}
