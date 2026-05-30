import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import Scene3D from '@/components/three/Scene3D';
import Arrow from '@/components/annotation/Arrow';
import TextBox from '@/components/annotation/TextBox';
import Highlight from '@/components/annotation/Highlight';
import type { Annotation } from '@/types';
import html2canvas from 'html2canvas';
import {
  ArrowLeft,
  Camera,
  ArrowRight,
  Type,
  Square,
  Circle,
  Trash2,
  Download,
  RotateCcw,
  Palette,
  MousePointer2,
  Plus,
  Info,
} from 'lucide-react';

type ToolType = 'select' | 'arrow' | 'text' | 'rect' | 'circle';

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
];

const QUICK_TEMPLATES = [
  { name: '位置冲突', type: 'arrow' as ToolType, color: '#ef4444', text: '两机位间距仅0.4米，小于安全距离1.5米' },
  { name: '视线遮挡', type: 'rect' as ToolType, color: '#f97316', text: '2号机位视线被立柱遮挡' },
  { name: '镜头越界', type: 'circle' as ToolType, color: '#eab308', text: '镜头照到禁摄区域' },
  { name: '整改建议', type: 'text' as ToolType, color: '#22c55e', text: '建议将机位向右移动2米' },
];

export default function ScreenshotTool() {
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { annotations, addAnnotation, removeAnnotation, clearAnnotations, cameras, conflicts } = useAppStore();

  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const getSVGCoords = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select') return;

    const coords = getSVGCoords(e);
    if (!coords) return;

    if (selectedTool === 'text') {
      const newAnnotation: Annotation = {
        id: `annot-${Date.now()}`,
        type: 'text',
        position: coords,
        text: '双击编辑文字',
        color: selectedColor,
      };
      addAnnotation(newAnnotation);
      setSelectedAnnotationId(newAnnotation.id);
      setSelectedTool('select');
      return;
    }

    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentPos(coords);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart) return;

    const coords = getSVGCoords(e);
    if (coords) {
      setCurrentPos(coords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !currentPos) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentPos(null);
      return;
    }

    const coords = getSVGCoords(e);
    if (!coords) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentPos(null);
      return;
    }

    const minDist = 5;
    const dist = Math.sqrt(
      Math.pow(coords.x - drawStart.x, 2) + Math.pow(coords.y - drawStart.y, 2)
    );

    if (dist > minDist) {
      const newAnnotation: Annotation = {
        id: `annot-${Date.now()}`,
        type: selectedTool === 'arrow' ? 'arrow' : selectedTool === 'circle' ? 'circle' : 'rect',
        position: drawStart,
        endPosition: coords,
        color: selectedColor,
      };
      addAnnotation(newAnnotation);
      setSelectedAnnotationId(newAnnotation.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentPos(null);
    setSelectedTool('select');
  };

  const handleAnnotationUpdate = (id: string, updates: Partial<Annotation>) => {
    const annotation = annotations.find(a => a.id === id);
    if (annotation) {
      removeAnnotation(id);
      addAnnotation({ ...annotation, ...updates });
    }
  };

  const handleExport = async () => {
    if (!sceneRef.current) return;

    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(sceneRef.current, {
        backgroundColor: '#0a0e14',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `机位预排截图_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setSelectedColor(template.color);
    setSelectedTool(template.type);

    if (template.type === 'text') {
      const centerX = 200;
      const centerY = 100;
      const newAnnotation: Annotation = {
        id: `annot-${Date.now()}`,
        type: 'text',
        position: { x: centerX, y: centerY },
        text: template.text,
        color: template.color,
      };
      addAnnotation(newAnnotation);
      setSelectedAnnotationId(newAnnotation.id);
      setSelectedTool('select');
    }

    setShowTemplates(false);
  };

  const pendingConflicts = conflicts.filter(c => c.status === 'pending');

  const getCursor = () => {
    switch (selectedTool) {
      case 'arrow':
      case 'rect':
      case 'circle':
        return 'crosshair';
      case 'text':
        return 'text';
      default:
        return 'default';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workspace')}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Camera className="w-6 h-6 text-cyan-400" />
                <h1 className="text-xl font-bold text-white">演示截图工具</h1>
              </div>
              <p className="text-sm text-gray-400">
                添加标注后导出截图，用于会议或培训演示
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting ? '导出中...' : '导出截图'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-gray-900/50 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-3">绘图工具</h3>
            <div className="grid grid-cols-5 gap-1">
              <ToolButton
                active={selectedTool === 'select'}
                onClick={() => setSelectedTool('select')}
                icon={<MousePointer2 className="w-4 h-4" />}
                label="选择"
              />
              <ToolButton
                active={selectedTool === 'arrow'}
                onClick={() => setSelectedTool('arrow')}
                icon={<ArrowRight className="w-4 h-4" />}
                label="箭头"
              />
              <ToolButton
                active={selectedTool === 'rect'}
                onClick={() => setSelectedTool('rect')}
                icon={<Square className="w-4 h-4" />}
                label="矩形"
              />
              <ToolButton
                active={selectedTool === 'circle'}
                onClick={() => setSelectedTool('circle')}
                icon={<Circle className="w-4 h-4" />}
                label="圆形"
              />
              <ToolButton
                active={selectedTool === 'text'}
                onClick={() => setSelectedTool('text')}
                icon={<Type className="w-4 h-4" />}
                label="文字"
              />
            </div>
          </div>

          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              标注颜色
            </h3>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-gray-800">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white transition-colors mb-3"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                快速标注模板
              </span>
              {showTemplates ? '收起' : '展开'}
            </button>

            {showTemplates && (
              <div className="space-y-2">
                {QUICK_TEMPLATES.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => applyTemplate(template)}
                    className="w-full flex items-center gap-3 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-left transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: template.color }}
                    />
                    <span className="text-sm text-gray-300">{template.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-medium text-white mb-3">操作</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (selectedAnnotationId) {
                    removeAnnotation(selectedAnnotationId);
                    setSelectedAnnotationId(null);
                  }
                }}
                disabled={!selectedAnnotationId}
                className="w-full flex items-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                删除选中标注
              </button>
              <button
                onClick={() => {
                  clearAnnotations();
                  setSelectedAnnotationId(null);
                }}
                disabled={annotations.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                清除所有标注
              </button>
            </div>
          </div>

          {pendingConflicts.length > 0 && (
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-yellow-400" />
                待标注冲突 ({pendingConflicts.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingConflicts.slice(0, 5).map(conflict => {
                  const cameraA = cameras.find(c => c.id === conflict.cameraAId);
                  return (
                    <div
                      key={conflict.id}
                      className="bg-gray-800/50 rounded-lg p-2 text-xs"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${
                          conflict.severity === 'critical' ? 'bg-red-500' :
                          conflict.severity === 'warning' ? 'bg-orange-500' : 'bg-yellow-500'
                        }`} />
                        <span className="text-white font-medium">
                          {cameraA?.number}号机位
                        </span>
                      </div>
                      <p className="text-gray-400 line-clamp-2">{conflict.humanDescription}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-4">
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-400 mb-2">使用提示</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 选择工具后在3D视图上拖拽绘制</li>
                <li>• 双击文字标注可编辑内容</li>
                <li>• 点击标注可选中进行删除</li>
                <li>• 导出时会包含所有标注</li>
              </ul>
            </div>
          </div>
        </div>

        <div
          ref={sceneRef}
          className="flex-1 relative"
          style={{ cursor: getCursor() }}
        >
          <Scene3D />

          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ pointerEvents: selectedTool !== 'select' ? 'auto' : 'none' }}
          >
            {selectedTool !== 'select' && (
              <rect width="100%" height="100%" fill="transparent" style={{ pointerEvents: 'all' }} />
            )}

            {annotations.map(annotation => {
              const isSelected = selectedAnnotationId === annotation.id;

              if (annotation.type === 'arrow') {
                return (
                  <Arrow
                    key={annotation.id}
                    annotation={annotation}
                    selected={isSelected}
                    onSelect={() => {
                      if (selectedTool === 'select') {
                        setSelectedAnnotationId(
                          selectedAnnotationId === annotation.id ? null : annotation.id
                        );
                      }
                    }}
                  />
                );
              }

              if (annotation.type === 'text') {
                return (
                  <foreignObject key={annotation.id} width="100%" height="100%">
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <svg width="100%" height="100%" style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}>
                        <TextBox
                          annotation={annotation}
                          selected={isSelected}
                          onSelect={() => {
                            if (selectedTool === 'select') {
                              setSelectedAnnotationId(
                                selectedAnnotationId === annotation.id ? null : annotation.id
                              );
                            }
                          }}
                          onUpdate={handleAnnotationUpdate}
                          onDelete={(id) => {
                            removeAnnotation(id);
                            setSelectedAnnotationId(null);
                          }}
                        />
                      </svg>
                    </div>
                  </foreignObject>
                );
              }

              if (annotation.type === 'rect' || annotation.type === 'circle') {
                return (
                  <Highlight
                    key={annotation.id}
                    annotation={annotation}
                    selected={isSelected}
                    onSelect={() => {
                      if (selectedTool === 'select') {
                        setSelectedAnnotationId(
                          selectedAnnotationId === annotation.id ? null : annotation.id
                        );
                      }
                    }}
                  />
                );
              }

              return null;
            })}

            {isDrawing && drawStart && currentPos && (
              <>
                {selectedTool === 'arrow' && (
                  <line
                    x1={drawStart.x}
                    y1={drawStart.y}
                    x2={currentPos.x}
                    y2={currentPos.y}
                    stroke={selectedColor}
                    strokeWidth={2}
                    strokeDasharray="5,5"
                  />
                )}
                {(selectedTool === 'rect' || selectedTool === 'circle') && (
                  <rect
                    x={Math.min(drawStart.x, currentPos.x)}
                    y={Math.min(drawStart.y, currentPos.y)}
                    width={Math.abs(currentPos.x - drawStart.x)}
                    height={Math.abs(currentPos.y - drawStart.y)}
                    fill={selectedColor}
                    fillOpacity={0.1}
                    stroke={selectedColor}
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    rx={selectedTool === 'rect' ? 4 : 0}
                  />
                )}
              </>
            )}
          </svg>

          <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur rounded-lg px-4 py-2 border border-gray-700">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">当前工具:</span>
              <span className="text-white font-medium">
                {selectedTool === 'select' && '选择/移动'}
                {selectedTool === 'arrow' && '箭头标注'}
                {selectedTool === 'rect' && '矩形框选'}
                {selectedTool === 'circle' && '圆形标注'}
                {selectedTool === 'text' && '文字标注'}
              </span>
              {annotations.length > 0 && (
                <>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-400">标注数:</span>
                  <span className="text-cyan-400 font-medium">{annotations.length}</span>
                </>
              )}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">图层说明</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-500" />
                  <span className="text-gray-300">红色箭头/框 - 指出问题位置</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-green-500" />
                  <span className="text-gray-300">绿色文字 - 说明整改建议</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-yellow-500" />
                  <span className="text-gray-300">黄色高亮 - 圈出重点区域</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">机位状态</div>
              <div className="flex gap-1">
                {cameras.map(cam => {
                  const hasConflict = conflicts.some(
                    c => (c.cameraAId === cam.id || c.cameraBId === cam.id) && c.status === 'pending'
                  );
                  return (
                    <div
                      key={cam.id}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        hasConflict
                          ? 'bg-red-600/30 text-red-400 border border-red-500/30'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {cam.number}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: JSX.Element;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
    </button>
  );
}
