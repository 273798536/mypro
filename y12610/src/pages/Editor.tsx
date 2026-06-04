import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { useStore } from '@/store';
import { ElementType } from '@/types';
import Toolbar from '@/components/Toolbar';
import ElementPanel from '@/components/ElementPanel';
import PropertyPanel from '@/components/PropertyPanel';
import CanvasElements from '@/components/CanvasElements';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadRecords = useStore((state) => state.loadRecords);
  const records = useStore((state) => state.records);
  const setCurrentRecord = useStore((state) => state.setCurrentRecord);
  const currentRecord = useStore((state) => state.getCurrentRecord());
  const scale = useStore((state) => state.scale);
  const positionX = useStore((state) => state.positionX);
  const positionY = useStore((state) => state.positionY);
  const setScale = useStore((state) => state.setScale);
  const setPosition = useStore((state) => state.setPosition);
  const addElement = useStore((state) => state.addElement);
  const saveHistory = useStore((state) => state.saveHistory);
  const selectElement = useStore((state) => state.selectElement);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const deleteElement = useStore((state) => state.deleteElement);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const exportToJSON = useStore((state) => state.exportToJSON);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (id && records.length > 0) {
      const record = records.find((r) => r.id === id);
      if (record) {
        setCurrentRecord(id);
      } else {
        navigate('/');
      }
    }
  }, [id, records, setCurrentRecord, navigate]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      if (e.key === 'Escape') {
        selectElement(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, deleteElement, undo, redo, selectElement]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - positionX) / oldScale,
        y: (pointer.y - positionY) / oldScale,
      };

      const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(oldScale * delta, 0.2), 3);

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setPosition(newPos.x, newPos.y);
    },
    [scale, positionX, positionY, setScale, setPosition]
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setPosition(e.target.x(), e.target.y());
    },
    [setPosition]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const elementType = e.dataTransfer.getData('elementType') as ElementType;
      if (!elementType || !stageRef.current) return;

      const stage = stageRef.current;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - positionX) / scale;
      const y = (e.clientY - rect.top - positionY) / scale;

      saveHistory();
      addElement(elementType, x, y);
    },
    [scale, positionX, positionY, addElement, saveHistory]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleExportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `${currentRecord?.title || 'diagram'}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleExportJSON = () => {
    if (!currentRecord) return;
    const json = exportToJSON(currentRecord.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${currentRecord.title || 'diagram'}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!currentRecord) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <Toolbar onExportPNG={handleExportPNG} onExportJSON={handleExportJSON} />

      <div className="flex-1 flex overflow-hidden">
        <ElementPanel />

        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-slate-200"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={positionX}
            y={positionY}
            onWheel={handleWheel}
            draggable
            onDragMove={handleDragMove}
            onClick={() => selectElement(null)}
            onTap={() => selectElement(null)}
          >
            <Layer>
              <CanvasElements stageRef={stageRef} />
            </Layer>
          </Stage>

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-slate-600 shadow-lg">
            <div className="flex items-center gap-4">
              <span>缩放: {Math.round(scale * 100)}%</span>
              <span>位置: ({Math.round(positionX)}, {Math.round(positionY)})</span>
              <span className="text-slate-400">滚轮缩放 · 拖拽平移</span>
            </div>
          </div>

          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg max-w-md">
            <h2 className="font-semibold text-slate-800 truncate">{currentRecord.title}</h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {currentRecord.elements.length} 个元素 · 最后更新:{' '}
              {new Date(currentRecord.updatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        <PropertyPanel />
      </div>
    </div>
  );
}
