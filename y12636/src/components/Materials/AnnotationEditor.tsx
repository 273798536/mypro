import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Material, AnnotationType } from '../../types';
import {
  Square, ArrowRight, Type, Circle, Undo2, Redo2, Trash2,
  Palette, X, Save,
} from 'lucide-react';

const annotationTools: { type: AnnotationType | 'select'; icon: any; label: string }[] = [
  { type: 'select', icon: Square, label: '选择' },
  { type: 'rect', icon: Square, label: '矩形' },
  { type: 'circle', icon: Circle, label: '圆形' },
  { type: 'arrow', icon: ArrowRight, label: '箭头' },
  { type: 'text', icon: Type, label: '文字' },
];

const colors = ['#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#3498DB', '#9B59B6', '#FFFFFF'];

export default function AnnotationEditor({ material }: { material: Material }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [tool, setTool] = useState<AnnotationType | 'select'>('select');
  const [color, setColor] = useState('#E67E22');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPt, setStartPt] = useState<{ x: number; y: number } | null>(null);
  const [currentPt, setCurrentPt] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);

  const { addAnnotation, currentUser } = useStore();
  const [history, setHistory] = useState<any[]>([]);

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!canvas || !ctx || !img || !img.complete) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const scale = Math.min(rect.width / img.width, rect.height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const ox = (rect.width - drawW) / 2;
    const oy = (rect.height - drawH) / 2;
    ctx.drawImage(img, ox, oy, drawW, drawH);

    material.annotations.forEach((ann) => {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = 2;
      const x = ox + (ann.x / 100) * drawW;
      const y = oy + (ann.y / 100) * drawH;
      const w = ann.width ? (ann.width / 100) * drawW : 0;
      const h = ann.height ? (ann.height / 100) * drawH : 0;

      if (ann.type === 'rect') {
        ctx.strokeRect(x, y, w, h);
      } else if (ann.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (ann.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        const angle = Math.atan2(h, w);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w - headLen * Math.cos(angle - Math.PI / 6), y + h - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x + w, y + h);
        ctx.lineTo(x + w - headLen * Math.cos(angle + Math.PI / 6), y + h - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (ann.type === 'text') {
        ctx.font = 'bold 14px sans-serif';
        const text = ann.text || '';
        const metrics = ctx.measureText(text);
        ctx.fillStyle = ann.color + 'CC';
        ctx.fillRect(x - 2, y - 14, metrics.width + 6, 20);
        ctx.fillStyle = ann.color;
        ctx.fillText(text, x + 1, y);
      }
    });

    if (isDrawing && startPt && currentPt && tool !== 'select' && tool !== 'text') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const x = Math.min(startPt.x, currentPt.x);
      const y = Math.min(startPt.y, currentPt.y);
      const w = Math.abs(currentPt.x - startPt.x);
      const h = Math.abs(currentPt.y - startPt.y);
      if (tool === 'rect') {
        ctx.strokeRect(x, y, w, h);
      } else if (tool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(currentPt.x, currentPt.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = material.imageUrl;
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.id]);

  useEffect(() => { draw(); }, [material.annotations, isDrawing, startPt, currentPt, tool, color]);

  const getCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const canvasToPercent = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const img = imgRef.current;
    if (!rect || !img) return { x: 0, y: 0 };
    const scale = Math.min(rect.width / img.width, rect.height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const ox = (rect.width - drawW) / 2;
    const oy = (rect.height - drawH) / 2;
    return {
      x: ((x - ox) / drawW) * 100,
      y: ((y - oy) / drawH) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') return;
    const pt = getCoords(e);
    if (tool === 'text') {
      setTextInput({ x: pt.x, y: pt.y, value: '' });
    } else {
      setIsDrawing(true);
      setStartPt(pt);
      setCurrentPt(pt);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentPt(getCoords(e));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPt || !currentPt || tool === 'select' || tool === 'text') {
      setIsDrawing(false);
      return;
    }
    const s = canvasToPercent(Math.min(startPt.x, currentPt.x), Math.min(startPt.y, currentPt.y));
    const w = Math.abs(currentPt.x - startPt.x);
    const h = Math.abs(currentPt.y - startPt.y);
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const img = imgRef.current;
    let pctW = 0, pctH = 0;
    if (rect && img) {
      const scale = Math.min(rect.width / img.width, rect.height / img.height);
      pctW = (w / (img.width * scale)) * 100;
      pctH = (h / (img.height * scale)) * 100;
    }

    addAnnotation(material.id, {
      type: tool,
      x: s.x, y: s.y,
      width: pctW, height: pctH,
      color,
      author: currentUser.name,
    });

    setIsDrawing(false);
    setStartPt(null);
    setCurrentPt(null);
  };

  const submitText = () => {
    if (!textInput || !textInput.value.trim()) { setTextInput(null); return; }
    const p = canvasToPercent(textInput.x, textInput.y);
    addAnnotation(material.id, {
      type: 'text', x: p.x, y: p.y, color,
      text: textInput.value,
      author: currentUser.name,
    });
    setTextInput(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 border-b border-port-border flex items-center justify-between px-4 bg-port-panel/50">
        <div className="flex items-center gap-1">
          {annotationTools.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setTool(type)}
              title={label}
              className={`p-2 rounded-md transition-all ${
                tool === type
                  ? 'bg-port-deep text-white'
                  : 'text-slate-400 hover:text-white hover:bg-port-border'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}

          <div className="h-5 w-px bg-port-border mx-2" />

          <div className="flex items-center gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  color === c ? 'border-white scale-110' : 'border-transparent hover:border-slate-500'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="h-5 w-px bg-port-border mx-2" />

          <button className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-port-border" title="撤销">
            <Undo2 className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-port-border" title="重做">
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-port-bg overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {textInput && (
          <div
            className="absolute z-10 flex items-center gap-1"
            style={{ left: textInput.x, top: textInput.y - 20 }}
          >
            <input
              autoFocus
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && submitText()}
              style={{ color }}
              className="bg-port-panel border border-port-border rounded px-2 py-1 text-sm font-bold focus:outline-none w-40"
              placeholder="输入标注文字..."
            />
            <button onClick={submitText} className="p-1 rounded bg-port-deep text-white hover:bg-port-dark">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTextInput(null)} className="p-1 rounded bg-port-border text-slate-300 hover:bg-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="h-9 border-t border-port-border px-4 flex items-center justify-between text-xs text-slate-500 bg-port-panel/50">
        <span>提示: 选择工具后在图片上拖拽绘制标注。红色=错误，橙色=警告，绿色=确认</span>
        <span>共 {material.annotations.length} 个标注</span>
      </div>
    </div>
  );
}
