import { Stage, Layer, Rect, Group, Text, Line, Circle } from 'react-konva';
import { useRef, useEffect } from 'react';
import Konva from 'konva';
import { useAppStore } from '../../store/appStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../types';
import { getStatusColor } from '../../utils/coordinateUtils';

export default function CanvasArea() {
  const {
    records,
    selectedRecordId,
    selectRecord,
    zoom,
    offset,
    setZoom,
    setOffset,
    moveRecord,
    getFilteredRecords,
  } = useAppStore();

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ id: string | null; startX: number; startY: number }>({
    id: null,
    startX: 0,
    startY: 0,
  });

  const filteredRecords = getFilteredRecords();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, setZoom]);

  const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setOffset({ x: e.target.x(), y: e.target.y() });
  };

  const handleRecordDragStart = (e: Konva.KonvaEventObject<DragEvent>, recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (!record) return;
    dragStateRef.current = {
      id: recordId,
      startX: record.xCoordinate,
      startY: record.yCoordinate,
    };
    selectRecord(recordId);
    e.cancelBubble = true;
  };

  const handleRecordDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const absPos = node.getAbsolutePosition();
    node.position({
      x: Math.max(0, Math.min(CANVAS_WIDTH, absPos.x)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT, absPos.y)),
    });
  };

  const handleRecordDragEnd = (e: Konva.KonvaEventObject<DragEvent>, recordId: string) => {
    const node = e.target;
    const absPos = node.getAbsolutePosition();
    const newX = Math.max(0, Math.min(CANVAS_WIDTH, absPos.x));
    const newY = Math.max(0, Math.min(CANVAS_HEIGHT, absPos.y));

    if (Math.abs(newX - dragStateRef.current.startX) > 1 || Math.abs(newY - dragStateRef.current.startY) > 1) {
      moveRecord(recordId, newX, newY);
    }
    dragStateRef.current = { id: null, startX: 0, startY: 0 };
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      selectRecord(null);
    }
  };

  const gridSize = 50;
  const gridLines = [];

  for (let i = 0; i <= CANVAS_WIDTH; i += gridSize) {
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[i, 0, i, CANVAS_HEIGHT]}
        stroke="#E2E8F0"
        strokeWidth={0.5}
      />
    );
  }
  for (let i = 0; i <= CANVAS_HEIGHT; i += gridSize) {
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, i, CANVAS_WIDTH, i]}
        stroke="#E2E8F0"
        strokeWidth={0.5}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#EEF2F7] overflow-hidden relative"
    >
      <Stage
        ref={stageRef}
        width={typeof window !== 'undefined' ? window.innerWidth - 360 : 900}
        height={typeof window !== 'undefined' ? window.innerHeight - 150 : 600}
        scaleX={zoom}
        scaleY={zoom}
        x={offset.x}
        y={offset.y}
        draggable
        onDragEnd={handleStageDragEnd}
        onClick={handleStageClick}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth={1}
            shadowColor="rgba(0,0,0,0.05)"
            shadowBlur={8}
          />

          {gridLines}

          <Rect
            x={40}
            y={40}
            width={200}
            height={160}
            fill="#E8EEF5"
            stroke="#9AB4D0"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text x={50} y={50} text="安检区" fontSize={14} fill="#4673A5" fontStyle="bold" />

          <Rect
            x={CANVAS_WIDTH - 280}
            y={40}
            width={240}
            height={160}
            fill="#E8F5E9"
            stroke="#81C784"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text x={CANVAS_WIDTH - 270} y={50} text="出口A" fontSize={14} fill="#388E3C" fontStyle="bold" />

          <Rect
            x={40}
            y={CANVAS_HEIGHT - 200}
            width={180}
            height={160}
            fill="#FFF3E0"
            stroke="#FFB74D"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text x={50} y={CANVAS_HEIGHT - 190} text="票务中心" fontSize={14} fill="#F57C00" fontStyle="bold" />

          <Rect
            x={CANVAS_WIDTH / 2 - 100}
            y={CANVAS_HEIGHT - 200}
            width={200}
            height={160}
            fill="#F3E5F5"
            stroke="#BA68C8"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text
            x={CANVAS_WIDTH / 2 - 90}
            y={CANVAS_HEIGHT - 190}
            text="换乘通道"
            fontSize={14}
            fill="#7B1FA2"
            fontStyle="bold"
          />
        </Layer>

        <Layer>
          {filteredRecords.map((record) => {
            const isSelected = selectedRecordId === record.id;
            const color = getStatusColor(record.status, record.isFlipped);
            const size = record.type === 'warning' ? 36 : record.type === 'info' ? 28 : 32;

            return (
              <Group
                key={record.id}
                x={record.xCoordinate}
                y={record.yCoordinate}
                draggable
                onDragStart={(e) => handleRecordDragStart(e, record.id)}
                onDragMove={handleRecordDragMove}
                onDragEnd={(e) => handleRecordDragEnd(e, record.id)}
                onClick={(e) => {
                  selectRecord(record.id);
                  e.cancelBubble = true;
                }}
              >
                {isSelected && (
                  <Circle
                    radius={size + 8}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={3}
                    dash={[6, 4]}
                    opacity={0.8}
                  />
                )}

                {record.isFlipped && (
                  <Circle radius={size + 14} fill={color} opacity={0.12} />
                )}

                <Circle
                  radius={size}
                  fill={color}
                  opacity={isSelected ? 1 : 0.9}
                  shadowColor={color}
                  shadowBlur={isSelected ? 12 : 4}
                  shadowOpacity={0.3}
                />

                <Text
                  text={record.label.slice(0, 2)}
                  fontSize={size * 0.55}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  x={-size * 0.45}
                  y={-size * 0.32}
                  width={size * 0.9}
                  align="center"
                />

                <Text
                  text={record.label}
                  fontSize={11}
                  fill="#1A2332"
                  x={-60}
                  y={size + 6}
                  width={120}
                  align="center"
                  fontStyle="500"
                />

                <Text
                  text={`(${Math.round(record.xCoordinate)}, ${Math.round(record.yCoordinate)})`}
                  fontSize={9}
                  fill="#64748B"
                  x={-50}
                  y={size + 20}
                  width={100}
                  align="center"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg shadow-soft">
        画布尺寸: {CANVAS_WIDTH} × {CANVAS_HEIGHT} | 滚轮缩放 · 空白拖拽平移 · 拖拽标记调整位置
      </div>
    </div>
  );
}
