import { useState, useRef } from 'react';
import { Trash2, RotateCw, Check, X } from 'lucide-react';
import { useAppStore } from '../store';
import type { Sticker } from '../types';

interface StickerCanvasProps {
  stickers: Sticker[];
  onCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  interactive: boolean;
}

const StickerCanvas = ({ stickers, onCanvasClick, interactive }: StickerCanvasProps) => {
  const { moveSticker, flipSticker, deleteSticker, updateStickerVerification } = useAppStore();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [flippingId, setFlippingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, sticker: Sticker) => {
    if (!interactive) return;
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDraggingId(sticker.id);
    setDragOffset({
      x: e.clientX - rect.left - sticker.x,
      y: e.clientY - rect.top - sticker.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left - dragOffset.x) / 40) * 40;
    const y = Math.round((e.clientY - rect.top - dragOffset.y) / 40) * 40;
    
    const boundedX = Math.max(0, Math.min(x, rect.width - 80));
    const boundedY = Math.max(0, Math.min(y, rect.height - 80));
    
    moveSticker(draggingId, boundedX, boundedY);
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleFlip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!interactive) return;
    
    setFlippingId(id);
    setTimeout(() => setFlippingId(null), 600);
    flipSticker(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!interactive) return;
    deleteSticker(id);
  };

  const handleVerify = (e: React.MouseEvent, id: string, verified: boolean) => {
    e.stopPropagation();
    updateStickerVerification(id, verified);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-[500px] canvas-grid rounded-lg overflow-hidden cursor-crosshair"
      onClick={onCanvasClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
    >
      <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-lg" />
      
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className={`absolute w-16 h-16 rounded-lg cursor-move transition-transform duration-200 sticker-shadow ${
            flippingId === sticker.id ? 'animate-flip' : ''
          } ${draggingId === sticker.id ? 'scale-110 z-20' : 'z-10'}`}
          style={{
            left: sticker.x,
            top: sticker.y,
            backgroundColor: sticker.color,
            transform: sticker.flipped ? 'scaleX(-1)' : 'scaleX(1)',
          }}
          onMouseDown={(e) => handleMouseDown(e, sticker)}
          onMouseEnter={() => setHoveredId(sticker.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <span 
              className="text-xs font-bold text-center px-1"
              style={{ transform: sticker.flipped ? 'scaleX(-1)' : 'scaleX(1)' }}
            >
              {sticker.label}
            </span>
            {sticker.flipped && (
              <span 
                className="text-[10px] opacity-70"
                style={{ transform: 'scaleX(-1)' }}
              >
                已翻转
              </span>
            )}
          </div>
          
          {sticker.verified && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center shadow-lg">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          
          {hoveredId === sticker.id && interactive && (
            <div 
              className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-slate-800 rounded-lg p-1 shadow-lg z-30"
              style={{ transform: `translateX(-50%) ${sticker.flipped ? 'scaleX(-1)' : ''}` }}
            >
              <button
                onClick={(e) => handleVerify(e, sticker.id, !sticker.verified)}
                className={`p-1.5 rounded transition-colors ${
                  sticker.verified ? 'bg-success text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
                title={sticker.verified ? '取消验证' : '验证通过'}
              >
                {sticker.verified ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              </button>
              <button
                onClick={(e) => handleFlip(e, sticker.id)}
                className="p-1.5 rounded bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
                title="翻转"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => handleDelete(e, sticker.id)}
                className="p-1.5 rounded bg-white/10 text-white/70 hover:bg-danger/50 transition-colors"
                title="删除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}

      {stickers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-white/40 text-sm">
              {interactive ? '选择贴纸类型后点击画布添加' : '点击「开始」按钮开始标注'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerCanvas;
