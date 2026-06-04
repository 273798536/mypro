import { useRef } from 'react';
import { Rect, Text, Group, Circle, Arrow, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import { CanvasElement } from '@/types';
import { useStore } from '@/store';

interface CanvasElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
}

function CarShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(10, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <Group>
      <Rect
        ref={shapeRef}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        fill={element.color}
        stroke={isSelected ? '#3b82f6' : element.strokeColor}
        strokeWidth={isSelected ? 3 : element.strokeWidth}
        opacity={element.opacity}
        cornerRadius={4}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        shadowColor={element.isColorOutOfBounds ? '#ef4444' : 'transparent'}
        shadowBlur={element.isColorOutOfBounds ? 10 : 0}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={1}
      />
      <Rect
        x={element.x + element.width * 0.1}
        y={element.y + element.height * 0.15}
        width={element.width * 0.3}
        height={element.height * 0.4}
        rotation={element.rotation}
        fill="rgba(255,255,255,0.3)"
        cornerRadius={2}
        listening={false}
      />
      <Rect
        x={element.x + element.width * 0.6}
        y={element.y + element.height * 0.15}
        width={element.width * 0.3}
        height={element.height * 0.4}
        rotation={element.rotation}
        fill="rgba(255,255,255,0.3)"
        cornerRadius={2}
        listening={false}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </Group>
  );
}

function RoadShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <Group>
      <Rect
        ref={shapeRef}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        fill={element.color}
        stroke={isSelected ? '#3b82f6' : element.strokeColor}
        strokeWidth={isSelected ? 3 : element.strokeWidth}
        opacity={element.opacity}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        shadowColor={element.isColorOutOfBounds ? '#ef4444' : 'transparent'}
        shadowBlur={element.isColorOutOfBounds ? 10 : 0}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={1}
      />
      <Line
        points={[
          element.x,
          element.y + element.height / 2,
          element.x + element.width,
          element.y + element.height / 2,
        ]}
        stroke="#fbbf24"
        strokeWidth={2}
        dash={[15, 10]}
        rotation={element.rotation}
        listening={false}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 30 || newBox.height < 15) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </Group>
  );
}

function ArrowShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Arrow>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <Group>
      <Arrow
        ref={shapeRef}
        x={element.x}
        y={element.y}
        points={[0, element.height / 2, element.width, element.height / 2]}
        pointerLength={element.height * 0.6}
        pointerWidth={element.height}
        fill={element.color}
        stroke={isSelected ? '#3b82f6' : element.strokeColor}
        strokeWidth={isSelected ? 3 : element.strokeWidth}
        opacity={element.opacity}
        rotation={element.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        shadowColor={element.isColorOutOfBounds ? '#ef4444' : 'transparent'}
        shadowBlur={element.isColorOutOfBounds ? 10 : 0}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={1}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </Group>
  );
}

function MarkerShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(10, element.width * scaleX),
      height: Math.max(10, element.height * scaleX),
    });
  };

  const radius = element.width / 2;

  return (
    <Group>
      <Circle
        ref={shapeRef}
        x={element.x + radius}
        y={element.y + radius}
        radius={radius}
        fill={element.color}
        stroke={isSelected ? '#3b82f6' : element.strokeColor}
        strokeWidth={isSelected ? 3 : element.strokeWidth}
        opacity={element.opacity}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        shadowColor={element.isColorOutOfBounds ? '#ef4444' : 'transparent'}
        shadowBlur={element.isColorOutOfBounds ? 10 : 0}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={1}
      />
      <Circle
        x={element.x + radius}
        y={element.y + radius}
        radius={radius * 0.4}
        fill={element.strokeColor}
        listening={false}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </Group>
  );
}

function TextShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  return (
    <Group>
      <Text
        ref={shapeRef}
        x={element.x}
        y={element.y}
        text={element.text || '文本'}
        fontSize={element.fontSize || 14}
        fill={element.color}
        opacity={element.opacity}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        width={element.width}
        wrap="word"
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          enabledAnchors={['middle-left', 'middle-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 50) {
              return oldBox;
            }
            return { ...newBox, height: oldBox.height };
          }}
        />
      )}
    </Group>
  );
}

function ShapeShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(10, node.width() * scaleX),
      height: Math.max(10, node.height() * scaleY),
      rotation: node.rotation(),
    });
  };

  return (
    <Group>
      <Rect
        ref={shapeRef}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        fill={element.color}
        stroke={isSelected ? '#3b82f6' : element.strokeColor}
        strokeWidth={isSelected ? 3 : element.strokeWidth}
        opacity={element.opacity}
        cornerRadius={8}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        shadowColor={element.isColorOutOfBounds ? '#ef4444' : 'transparent'}
        shadowBlur={element.isColorOutOfBounds ? 10 : 0}
        shadowOffset={{ x: 0, y: 0 }}
        shadowOpacity={1}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </Group>
  );
}

function LineShape({
  element,
  isSelected,
  onSelect,
  onChange,
}: CanvasElementProps) {
  const shapeRef = useRef<Konva.Line>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  return (
    <Group>
      <Line
        ref={shapeRef}
        x={element.x}
        y={element.y}
        points={[0, element.height / 2, element.width, element.height / 2]}
        stroke={element.color}
        strokeWidth={element.height}
        opacity={element.opacity}
        rotation={element.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          nodes={[shapeRef.current!]}
          enabledAnchors={['middle-left', 'middle-right']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20) {
              return oldBox;
            }
            return { ...newBox, height: oldBox.height };
          }}
        />
      )}
    </Group>
  );
}

interface CanvasElementsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function CanvasElements({ stageRef }: CanvasElementsProps) {
  const currentRecord = useStore((state) => state.getCurrentRecord());
  const selectedElementId = useStore((state) => state.selectedElementId);
  const selectElement = useStore((state) => state.selectElement);
  const updateElement = useStore((state) => state.updateElement);
  const saveHistory = useStore((state) => state.saveHistory);

  const handleElementChange = (id: string, updates: Partial<CanvasElement>) => {
    saveHistory();
    updateElement(id, updates);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      selectElement(null);
    }
  };

  if (!currentRecord) return null;

  const elementComponents: Record<string, React.FC<CanvasElementProps>> = {
    car: CarShape,
    road: RoadShape,
    arrow: ArrowShape,
    marker: MarkerShape,
    text: TextShape,
    shape: ShapeShape,
    line: LineShape,
  };

  return (
    <>
      {currentRecord.elements.map((element) => {
        const Component = elementComponents[element.type] || ShapeShape;
        return (
          <Component
            key={element.id}
            element={element}
            isSelected={selectedElementId === element.id}
            onSelect={() => selectElement(element.id)}
            onChange={(updates) => handleElementChange(element.id, updates)}
          />
        );
      })}
    </>
  );
}
