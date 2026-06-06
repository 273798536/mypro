import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Rect, Circle, Group, Text, Transformer } from "react-konva";
import { useAnnotationStore } from "@/store/useAnnotationStore";
import { generateGridLines, snapToGrid } from "@/utils/gridUtils";
import type KonvaTypes from "konva";
import type { Annotation, Point } from "@/types";
import { Upload, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const STAGE_PADDING = 40;

export default function AnnotationCanvas() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<KonvaTypes.Stage>(null);
  const trRef = useRef<KonvaTypes.Transformer>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: STAGE_PADDING, y: STAGE_PADDING });
  const [selectedIdLocal, setSelectedIdLocal] = useState<string | null>(null);
  const [selectedShape, setSelectedShape] = useState<KonvaTypes.Shape | null>(null);

  const {
    record,
    toolMode,
    selectedId,
    setSelectedId,
    isDrawing,
    drawingPoints,
    imageSize,
    setImageSize,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    addPolygonPoint,
    updateAnnotation,
    getFilteredAnnotations,
    updateImage,
    pushHistory,
  } = useAnnotationStore();

  const filtered = getFilteredAnnotations();

  useEffect(() => {
    if (!record.imageUrl) {
      setBgImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBgImage(img);
      setImageSize(img.width, img.height);
      fitStageToImage(img.width, img.height);
    };
    img.src = record.imageUrl;
  }, [record.imageUrl, setImageSize]);

  useEffect(() => {
    setSelectedIdLocal(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedIdLocal && selectedShape) {
      trRef.current.nodes([selectedShape]);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIdLocal, selectedShape]);

  const fitStageToImage = (w: number, h: number) => {
    const container = stageRef.current?.container();
    if (!container) return;
    const cw = container.clientWidth - STAGE_PADDING * 2;
    const ch = container.clientHeight - STAGE_PADDING * 2;
    const scale = Math.min(cw / w, ch / h, 1);
    setStageScale(scale);
    setStagePos({
      x: (container.clientWidth - w * scale) / 2,
      y: (container.clientHeight - h * scale) / 2,
    });
  };

  const getImagePointerPos = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getPointerPosition();
    if (!p) return null;
    const x = (p.x - stagePos.x) / stageScale;
    const y = (p.y - stagePos.y) / stageScale;
    const raw = { x, y };
    return record.gridConfig.enabled ? snapToGrid(raw, record.gridConfig) : raw;
  }, [stagePos, stageScale, record.gridConfig]);

  const handleImageUploadClick = () => fileInputRef.current?.click();

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateImage(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleStageMouseDown = (e: KonvaTypes.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) {
      if (toolMode === "select") return;
    }
    const pos = getImagePointerPos();
    if (!pos) return;

    if (toolMode === "pan") return;
    if (toolMode === "zoom") return;

    if (toolMode === "polygon") {
      addPolygonPoint(pos);
      return;
    }

    if (toolMode === "select") {
      setSelectedId(null);
      setSelectedShape(null);
      setSelectedIdLocal(null);
      return;
    }

    startDrawing(pos);
  };

  const handleStageMouseMove = () => {
    if (!isDrawing) return;
    const pos = getImagePointerPos();
    if (!pos) return;
    updateDrawing(pos);
  };

  const handleStageMouseUp = () => {
    if (!isDrawing) return;
    if (toolMode === "polygon") return;
    finishDrawing();
  };

  const handleWheel = (e: KonvaTypes.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, oldScale * scaleBy));
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleZoom = (factor: number) => {
    const container = stageRef.current?.container();
    if (!container) return;
    const oldScale = stageScale;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const newScale = Math.max(0.1, Math.min(5, oldScale * factor));
    const centerPoint = {
      x: (cx - stagePos.x) / oldScale,
      y: (cy - stagePos.y) / oldScale,
    };
    setStageScale(newScale);
    setStagePos({
      x: cx - centerPoint.x * newScale,
      y: cy - centerPoint.y * newScale,
    });
  };

  const handleResetView = () => {
    if (bgImage) {
      fitStageToImage(bgImage.width, bgImage.height);
    }
  };

  const handleAnnotationDragEnd = (e: KonvaTypes.KonvaEventObject<DragEvent>, ann: Annotation) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    if (ann.type === "rectangle" || ann.type === "circle" || ann.type === "polygon") {
      const dx = newX;
      const dy = newY;
      const movedCoords = ann.coordinates.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      const snapped = record.gridConfig.enabled
        ? movedCoords.map((p) => snapToGrid(p, record.gridConfig))
        : movedCoords;
      pushHistory();
      updateAnnotation(ann.id, {
        coordinates: snapped.map((p) => ({ x: p.x - dx, y: p.y - dy })),
      });
      node.position({ x: 0, y: 0 });
    }
  };

  const handleTransformEnd = (e: KonvaTypes.KonvaEventObject<Event>, ann: Annotation) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);

    let newCoords: Point[] = [];
    if (ann.type === "rectangle" && ann.coordinates.length >= 2) {
      const [p1, p2] = ann.coordinates;
      const w = Math.abs(p2.x - p1.x) * scaleX;
      const h = Math.abs(p2.y - p1.y) * scaleY;
      newCoords = [
        { x: node.x(), y: node.y() },
        { x: node.x() + w, y: node.y() + h },
      ];
    } else if (ann.type === "circle" && ann.coordinates.length >= 2) {
      const [c, edge] = ann.coordinates;
      const r = Math.sqrt(Math.pow(edge.x - c.x, 2) + Math.pow(edge.y - c.y, 2));
      const newR = r * Math.max(scaleX, scaleY);
      newCoords = [
        { x: node.x(), y: node.y() },
        { x: node.x() + newR, y: node.y() },
      ];
    } else {
      newCoords = ann.coordinates.map((p) => ({
        x: node.x() + p.x * scaleX,
        y: node.y() + p.y * scaleY,
      }));
    }

    const snapped = record.gridConfig.enabled
      ? newCoords.map((p) => snapToGrid(p, record.gridConfig))
      : newCoords;
    pushHistory();
    updateAnnotation(ann.id, { coordinates: snapped });
  };

  const handleAnnotationClick = (
    e: KonvaTypes.KonvaEventObject<MouseEvent>,
    ann: Annotation
  ) => {
    if (toolMode !== "select") return;
    e.cancelBubble = true;
    setSelectedId(ann.id);
    setSelectedIdLocal(ann.id);
    setSelectedShape(e.target as KonvaTypes.Shape);
  };

  const getCursor = () => {
    switch (toolMode) {
      case "pan":
        return "grab";
      case "zoom":
        return "zoom-in";
      case "select":
        return "default";
      default:
        return "crosshair";
    }
  };

  const canvasW = Math.max(800, imageSize.width);
  const canvasH = Math.max(600, imageSize.height);

  const gridLines = record.gridConfig.enabled
    ? generateGridLines(canvasW, canvasH, record.gridConfig.size)
    : { vertical: [], horizontal: [] };

  const renderAnnotationShape = (ann: Annotation) => {
    const commonProps = {
      key: ann.id,
      stroke: ann.color,
      strokeWidth: 2 / stageScale,
      opacity: ann.opacity ?? 0.85,
      draggable: toolMode === "select",
      onClick: (e: KonvaTypes.KonvaEventObject<MouseEvent>) => handleAnnotationClick(e, ann),
      onTap: (e: KonvaTypes.KonvaEventObject<Event>) => handleAnnotationClick(e as KonvaTypes.KonvaEventObject<MouseEvent>, ann),
      onDragEnd: (e: KonvaTypes.KonvaEventObject<DragEvent>) => handleAnnotationDragEnd(e, ann),
      onTransformEnd: (e: KonvaTypes.KonvaEventObject<Event>) => handleTransformEnd(e, ann),
    };

    switch (ann.type) {
      case "rectangle": {
        if (ann.coordinates.length < 2) return null;
        const [p1, p2] = ann.coordinates;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        return (
          <Group key={ann.id}>
            <Rect
              {...commonProps}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={`${ann.color}22`}
            />
            {ann.label && (
              <Text
                x={x}
                y={y - 20 / stageScale}
                text={ann.label}
                fontSize={14 / stageScale}
                fill={ann.color}
                fontStyle="bold"
              />
            )}
          </Group>
        );
      }
      case "circle": {
        if (ann.coordinates.length < 2) return null;
        const [c, edge] = ann.coordinates;
        const r = Math.sqrt(
          Math.pow(edge.x - c.x, 2) + Math.pow(edge.y - c.y, 2)
        );
        return (
          <Group key={ann.id}>
            <Circle
              {...commonProps}
              x={c.x}
              y={c.y}
              radius={r}
              fill={`${ann.color}22`}
            />
            {ann.label && (
              <Text
                x={c.x - r}
                y={c.y - r - 20 / stageScale}
                text={ann.label}
                fontSize={14 / stageScale}
                fill={ann.color}
                fontStyle="bold"
              />
            )}
          </Group>
        );
      }
      case "polygon":
      case "freehand": {
        if (ann.coordinates.length < 2) return null;
        const flatPoints = ann.coordinates.flatMap((p) => [p.x, p.y]);
        const cx = Math.min(...ann.coordinates.map((p) => p.x));
        const cy = Math.min(...ann.coordinates.map((p) => p.y));
        return (
          <Group key={ann.id}>
            <Line
              {...commonProps}
              points={flatPoints}
              closed={ann.type === "polygon"}
              fill={ann.type === "polygon" ? `${ann.color}22` : undefined}
            />
            {ann.label && (
              <Text
                x={cx}
                y={cy - 20 / stageScale}
                text={ann.label}
                fontSize={14 / stageScale}
                fill={ann.color}
                fontStyle="bold"
              />
            )}
          </Group>
        );
      }
      default:
        return null;
    }
  };

  const renderDrawingShape = () => {
    if (!isDrawing || drawingPoints.length === 0) return null;
    const { currentColor, toolMode: mode } = useAnnotationStore.getState();
    const props = {
      stroke: currentColor,
      strokeWidth: 2 / stageScale,
      opacity: 0.7,
      dash: [6 / stageScale, 4 / stageScale],
    };

    if (mode === "rectangle" && drawingPoints.length >= 2) {
      const [p1, p2] = drawingPoints;
      return (
        <Rect
          x={Math.min(p1.x, p2.x)}
          y={Math.min(p1.y, p2.y)}
          width={Math.abs(p2.x - p1.x)}
          height={Math.abs(p2.y - p1.y)}
          fill={`${currentColor}22`}
          {...props}
        />
      );
    }
    if (mode === "circle" && drawingPoints.length >= 2) {
      const [c, edge] = drawingPoints;
      const r = Math.sqrt(
        Math.pow(edge.x - c.x, 2) + Math.pow(edge.y - c.y, 2)
      );
      return <Circle x={c.x} y={c.y} radius={r} fill={`${currentColor}22`} {...props} />;
    }
    if ((mode === "polygon" || mode === "freehand") && drawingPoints.length >= 1) {
      const flat = drawingPoints.flatMap((p) => [p.x, p.y]);
      if (mode === "polygon" && drawingPoints.length > 1) {
        const first = drawingPoints[0];
        flat.push(first.x, first.y);
      }
      return <Line points={flat} closed={false} {...props} />;
    }
    return null;
  };

  return (
    <div className="relative flex h-full flex-1 flex-col bg-gray-100">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <button
          onClick={handleImageUploadClick}
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          导入医学影像
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <button
          onClick={() => handleZoom(1.2)}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <ZoomIn className="h-3.5 w-3.5" />
          放大
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <ZoomOut className="h-3.5 w-3.5" />
          缩小
        </button>
        <button
          onClick={handleResetView}
          className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          适应
        </button>
        <div className="ml-auto text-xs text-gray-500">
          缩放 {(stageScale * 100).toFixed(0)}%
          {record.isFlipped && (
            <span className="ml-3 rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
              ⚠️ 已翻转
            </span>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {!bgImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <div className="mb-3 text-5xl">🩻</div>
            <div className="mb-2 text-base font-medium">尚未加载医学影像</div>
            <div className="text-sm">点击上方「导入医学影像」按钮开始描绘</div>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={typeof window !== "undefined" ? window.innerWidth - 320 - 320 : 1000}
          height={typeof window !== "undefined" ? window.innerHeight - 120 : 700}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          draggable={toolMode === "pan"}
          onDragMove={(e) => {
            if (toolMode === "pan") {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onWheel={handleWheel}
          style={{ cursor: getCursor() }}
        >
          <Layer>
            <Rect
              x={-10000}
              y={-10000}
              width={20000}
              height={20000}
              fill="#F3F4F6"
            />
            {bgImage && (
              <KonvaImage image={bgImage} x={0} y={0} width={bgImage.width} height={bgImage.height} />
            )}
            {record.gridConfig.enabled && (
              <>
                {gridLines.vertical.map((x, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[x, 0, x, canvasH]}
                    stroke={record.gridConfig.color}
                    strokeWidth={1 / stageScale}
                    listening={false}
                  />
                ))}
                {gridLines.horizontal.map((y, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, y, canvasW, y]}
                    stroke={record.gridConfig.color}
                    strokeWidth={1 / stageScale}
                    listening={false}
                  />
                ))}
              </>
            )}

            {filtered.map((ann) => renderAnnotationShape(ann))}
            {renderDrawingShape()}

            <Transformer
              ref={trRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
              borderStroke="#165DFF"
              anchorStroke="#165DFF"
              anchorSize={8}
            />
          </Layer>
        </Stage>

        {isDrawing && toolMode !== "select" && toolMode !== "pan" && toolMode !== "zoom" && (
          <button
            onClick={cancelDrawing}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-gray-800 px-4 py-2 text-xs text-white shadow-lg hover:bg-gray-700"
          >
            按 Esc 或点击取消绘制
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
    </div>
  );
}
