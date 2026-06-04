import { useState } from 'react';
import { Layer, Rect, Text, Arrow, Group } from 'react-konva';
import Konva from 'konva';
import type { Annotation } from '@/types';
import { generateId } from '@/utils/helpers';
import { getRiskLevelColor, getAnnotationTypeLabel } from '@/utils/helpers';
import { useBatchStore } from '@/stores/useBatchStore';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { X } from 'lucide-react';

interface AnnotationToolProps {
  mapToCanvas: (lng: number, lat: number) => { x: number; y: number };
}

export function AnnotationTool({ mapToCanvas }: AnnotationToolProps) {
  const { devices, executeCommand } = useBatchStore();
  const {
    annotationType,
    annotationRiskLevel,
    isDrawing,
    drawingStart,
    drawingCurrent,
    showAnnotationDialog,
    annotationTargetDeviceId,
    startDrawing,
    updateDrawing,
    endDrawing,
    closeAnnotationDialog,
  } = useCanvasStore();

  const [annotationContent, setAnnotationContent] = useState('');
  const [annotationOpinion, setAnnotationOpinion] = useState('');

  const targetDevice = devices.find((d) => d.id === annotationTargetDeviceId);
  const riskColor = getRiskLevelColor(annotationRiskLevel);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    startDrawing(pos.x, pos.y);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    updateDrawing(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawingStart || !drawingCurrent) return;

    const width = Math.abs(drawingCurrent.x - drawingStart.x);
    const height = Math.abs(drawingCurrent.y - drawingStart.y);

    if (width < 10 && height < 10) {
      endDrawing();
      return;
    }

    if (annotationTargetDeviceId) {
      closeAnnotationDialog();
      return;
    }

    const nearbyDevice = findNearbyDevice(drawingStart.x, drawingStart.y);
    if (nearbyDevice) {
      openAnnotationDialog(nearbyDevice.id);
    }
    endDrawing();
  };

  const findNearbyDevice = (x: number, y: number) => {
    for (const device of devices) {
      const pos = mapToCanvas(device.x, device.y);
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2);
      if (dist < 40) return device;
    }
    return null;
  };

  const openAnnotationDialog = (deviceId: string) => {
    useCanvasStore.getState().openAnnotationDialog(deviceId);
  };

  const handleSubmitAnnotation = () => {
    if (!annotationTargetDeviceId || !annotationContent.trim()) return;

    const annotation: Annotation = {
      id: generateId(),
      deviceId: annotationTargetDeviceId,
      type: annotationType,
      content: annotationContent.trim(),
      riskLevel: annotationRiskLevel,
      opinion: annotationOpinion.trim(),
      timestamp: Date.now(),
      x: drawingStart?.x,
      y: drawingStart?.y,
      width: drawingCurrent && drawingStart ? Math.abs(drawingCurrent.x - drawingStart.x) : undefined,
      height: drawingCurrent && drawingStart ? Math.abs(drawingCurrent.y - drawingStart.y) : undefined,
    };

    executeCommand({
      type: 'annotation_add',
      description: `为${targetDevice?.name || '设备'}添加${getAnnotationTypeLabel(annotationType)}：${annotation.content}`,
      payload: {
        deviceId: annotationTargetDeviceId,
        annotation,
      },
      getPreviousState: () => ({
        deviceId: annotationTargetDeviceId,
        annotation,
      }),
      applyState: () => {},
    });

    setAnnotationContent('');
    setAnnotationOpinion('');
    endDrawing();
    closeAnnotationDialog();
  };

  const getPreviewShape = () => {
    if (!isDrawing || !drawingStart || !drawingCurrent) return null;

    const x = Math.min(drawingStart.x, drawingCurrent.x);
    const y = Math.min(drawingStart.y, drawingCurrent.y);
    const width = Math.abs(drawingCurrent.x - drawingStart.x);
    const height = Math.abs(drawingCurrent.y - drawingStart.y);

    switch (annotationType) {
      case 'rectangle':
        return (
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={riskColor}
            opacity={0.2}
            stroke={riskColor}
            strokeWidth={2}
            dash={[5, 3]}
          />
        );
      case 'arrow':
        return (
          <Arrow
            points={[drawingStart.x, drawingStart.y, drawingCurrent.x, drawingCurrent.y]}
            stroke={riskColor}
            strokeWidth={3}
            fill={riskColor}
            pointerLength={10}
            pointerWidth={10}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Layer onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        {devices.flatMap((device) =>
          device.annotations
            .filter((a) => a.x !== undefined && a.y !== undefined)
            .map((annotation) => {
              const riskColor = getRiskLevelColor(annotation.riskLevel);
              if (annotation.type === 'rectangle' && annotation.width && annotation.height) {
                return (
                  <Group key={annotation.id}>
                    <Rect
                      x={annotation.x}
                      y={annotation.y}
                      width={annotation.width}
                      height={annotation.height}
                      fill={riskColor}
                      opacity={0.15}
                      stroke={riskColor}
                      strokeWidth={2}
                      cornerRadius={4}
                    />
                    <Text
                      x={annotation.x}
                      y={annotation.y! - 18}
                      text={`${annotation.content.slice(0, 20)}${annotation.content.length > 20 ? '...' : ''}`}
                      fontSize={11}
                      fill={riskColor}
                      fontStyle="bold"
                    />
                  </Group>
                );
              }
              if (annotation.type === 'arrow') {
                return (
                  <Group key={annotation.id}>
                    <Arrow
                      points={[annotation.x!, annotation.y!, annotation.x! + 60, annotation.y! + 40]}
                      stroke={riskColor}
                      strokeWidth={3}
                      fill={riskColor}
                      pointerLength={10}
                      pointerWidth={10}
                    />
                  </Group>
                );
              }
              return null;
            })
        )}
        {getPreviewShape()}
      </Layer>

      {showAnnotationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-[500px] max-w-[90vw]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-[#1e3a5f]">
                添加标注 - {targetDevice?.name}
              </h3>
              <button
                onClick={closeAnnotationDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标注内容
                </label>
                <textarea
                  value={annotationContent}
                  onChange={(e) => setAnnotationContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none h-24"
                  placeholder="请输入风险描述..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  处理意见
                </label>
                <textarea
                  value={annotationOpinion}
                  onChange={(e) => setAnnotationOpinion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none h-20"
                  placeholder="请输入处理意见..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    风险等级
                  </label>
                  <div className="flex gap-2">
                    {(['safe', 'warning', 'danger'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          useCanvasStore.getState().setAnnotationRiskLevel(level)
                        }
                        className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                          annotationRiskLevel === level
                            ? 'ring-2 ring-offset-2'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: getRiskLevelColor(level) + '30',
                          color: getRiskLevelColor(level),
                          borderColor: getRiskLevelColor(level),
                        }}
                      >
                        {level === 'safe' ? '安全' : level === 'warning' ? '警示' : '危险'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标注类型
                  </label>
                  <select
                    value={annotationType}
                    onChange={(e) =>
                      useCanvasStore.getState().setAnnotationType(e.target.value as any)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  >
                    <option value="rectangle">区域标注</option>
                    <option value="text">文字标注</option>
                    <option value="arrow">箭头指向</option>
                    <option value="comment">备注</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeAnnotationDialog}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitAnnotation}
                disabled={!annotationContent.trim()}
                className="px-6 py-2 bg-[#1e3a5f] text-white rounded hover:bg-[#2a4a7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
