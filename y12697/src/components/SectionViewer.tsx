import { useRef, useEffect } from 'react';
import type { ProcessingRecord } from '../../../shared/types';

interface Props {
  imagePath: string | null;
  record: ProcessingRecord | null;
  onChange: (section: NonNullable<ProcessingRecord['sectionData']>) => void;
}

export default function SectionViewer({ imagePath, record, onChange }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragging = useRef<null | 'start' | 'end'>(null);

  const section = record?.sectionData ?? {
    cutLine: { x1: 100, y1: 100, x2: 400, y2: 300 },
    measurements: [{ label: '剖切距离', value: 0, unit: 'px' }],
  };

  useEffect(() => {
    if (!section.measurements || section.measurements.length === 0) return;
    const dx = section.cutLine.x2 - section.cutLine.x1;
    const dy = section.cutLine.y2 - section.cutLine.y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (Math.abs(section.measurements[0].value - dist) > 0.5) {
      onChange({
        ...section,
        measurements: [{ label: '剖切距离', value: Math.round(dist), unit: 'px' }],
      });
    }
  }, [section.cutLine.x1, section.cutLine.y1, section.cutLine.x2, section.cutLine.y2]);

  const handleDown = (e: React.MouseEvent, which: 'start' | 'end') => {
    dragging.current = which;
    e.preventDefault();
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const key = dragging.current;
      onChange({
        ...section,
        cutLine: {
          ...section.cutLine,
          [`x${key === 'start' ? 1 : 2}`]: x,
          [`y${key === 'start' ? 1 : 2}`]: y,
        } as any,
      });
    };
    const up = () => {
      dragging.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [section]);

  return (
    <div className="card-panel h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-charcoal-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-alert-orange animate-pulse" />
          <span className="text-sm font-medium">剖切查看</span>
        </div>
        <div className="font-mono text-xs text-charcoal-400">
          距离：{section.measurements?.[0]?.value ?? 0} {section.measurements?.[0]?.unit}
        </div>
      </div>
      <div
        ref={canvasRef}
        className="flex-1 relative bg-charcoal-950 overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #374151 1px, transparent 0)', backgroundSize: '20px 20px' }}
      >
        {imagePath ? (
          <img
            ref={imgRef}
            src={imagePath}
            alt="snapshot"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-charcoal-600 text-sm">
            暂无截图（导入后展示）
          </div>
        )}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1={section.cutLine.x1}
            y1={section.cutLine.y1}
            x2={section.cutLine.x2}
            y2={section.cutLine.y2}
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <circle
            cx={section.cutLine.x1}
            cy={section.cutLine.y1}
            r="8"
            fill="#f97316"
            className="pointer-events-auto cursor-move"
            onMouseDown={(e) => handleDown(e, 'start')}
          />
          <circle
            cx={section.cutLine.x2}
            cy={section.cutLine.y2}
            r="8"
            fill="#10b981"
            className="pointer-events-auto cursor-move"
            onMouseDown={(e) => handleDown(e, 'end')}
          />
        </svg>
        <div
          className="absolute font-mono text-[10px] text-alert-orange bg-charcoal-950/80 px-1.5 py-0.5 pointer-events-none"
          style={{ left: section.cutLine.x1 + 12, top: section.cutLine.y1 - 8 }}
        >
          A ({Math.round(section.cutLine.x1)}, {Math.round(section.cutLine.y1)})
        </div>
        <div
          className="absolute font-mono text-[10px] text-alert-green bg-charcoal-950/80 px-1.5 py-0.5 pointer-events-none"
          style={{ left: section.cutLine.x2 + 12, top: section.cutLine.y2 - 8 }}
        >
          B ({Math.round(section.cutLine.x2)}, {Math.round(section.cutLine.y2)})
        </div>
      </div>
      <div className="px-4 py-2 border-t border-charcoal-800 text-xs text-charcoal-500">
        拖动橙色 / 绿色控制点调整剖切位置，距离自动联动
      </div>
    </div>
  );
}
