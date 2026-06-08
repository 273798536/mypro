import { useRef, useState, useEffect } from 'react';
import { X, Eraser, Check, User, MessageSquare } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

export function Signature() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [operator, setOperator] = useState('');
  const [comment, setComment] = useState('');

  const showSignatureModal = useProjectStore((s) => s.showSignatureModal);
  const setShowSignatureModal = useProjectStore((s) => s.setShowSignatureModal);
  const completeConfirm = useProjectStore((s) => s.completeConfirm);

  useEffect(() => {
    if (showSignatureModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1B998B';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setHasDrawing(false);
    }
  }, [showSignatureModal]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawing(true);
    }
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setHasDrawing(false);
  };

  const submit = () => {
    if (!hasDrawing || !operator.trim()) {
      alert('请填写操作人并完成签名');
      return;
    }
    const dataUrl = canvasRef.current?.toDataURL('image/png') || '';
    completeConfirm(dataUrl, operator, comment);
    setShowSignatureModal(false);
  };

  if (!showSignatureModal) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="panel-card p-5 w-[480px] max-w-[95vw]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-engineering text-base text-sea-mist font-semibold">
            步骤三：人工确认签字
          </h3>
          <button onClick={() => setShowSignatureModal(false)} className="text-sea-mist/60 hover:text-sea-mist">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <User size={14} className="text-sea-mist/50" />
            <input
              type="text"
              placeholder="操作人姓名 *"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="flex-1 bg-ocean-slate/60 border border-wake-teal/20 rounded px-3 py-2 text-sm text-sea-mist placeholder:text-sea-mist/40 focus:outline-none focus:border-wake-teal"
            />
          </div>

          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-sea-mist/50 mt-2" />
            <textarea
              placeholder="评审意见（选填）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="flex-1 bg-ocean-slate/60 border border-wake-teal/20 rounded px-3 py-2 text-sm text-sea-mist placeholder:text-sea-mist/40 focus:outline-none focus:border-wake-teal resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-sea-mist/70 mb-1.5 block">签名区域 *</label>
            <div className="signature-pad border-2 border-dashed border-wake-teal/30 rounded overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={clearSignature} className="btn-secondary !py-1.5 text-xs flex items-center gap-1.5">
            <Eraser size={12} />
            清除
          </button>
          <button
            onClick={submit}
            disabled={!hasDrawing || !operator.trim()}
            className="btn-primary !py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <Check size={12} />
            确认签字
          </button>
        </div>
      </div>
    </div>
  );
}
