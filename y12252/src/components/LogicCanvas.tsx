import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { LogicLink } from '@/types/game';
import { cn } from '@/lib/utils';

const NODE_W = 160;
const NODE_H = 56;
const TRUNCATE_LEN = 18;

const linkColor: Record<LogicLink['status'], string> = {
  valid: '#22c55e',
  invalid: '#ef4444',
  pending: '#eab308',
};

const linkLabel: Record<LogicLink['status'], string> = {
  valid: '有效',
  invalid: '无效',
  pending: '待判',
};

function ArrowHead({ x, y, angle, color }: { x: number; y: number; angle: number; color: string }) {
  const size = 8;
  const p1x = x - size * Math.cos(angle - Math.PI / 6);
  const p1y = y - size * Math.sin(angle - Math.PI / 6);
  const p2x = x - size * Math.cos(angle + Math.PI / 6);
  const p2y = y - size * Math.sin(angle + Math.PI / 6);
  return <polygon points={`${x},${y} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />;
}

export default function LogicCanvas() {
  const conditions = useGameStore((s) => s.conditions);
  const logicLinks = useGameStore((s) => s.logicLinks);
  const linkingFrom = useGameStore((s) => s.linkingFrom);
  const startLinking = useGameStore((s) => s.startLinking);
  const completeLink = useGameStore((s) => s.completeLink);
  const cancelLinking = useGameStore((s) => s.cancelLinking);
  const moveCard = useGameStore((s) => s.moveCard);
  const judgeLink = useGameStore((s) => s.judgeLink);
  const removeLink = useGameStore((s) => s.removeLink);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ linkId: string; x: number; y: number } | null>(null);

  const canvasCards = conditions.filter((c) => c.isOnCanvas);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const card = conditions.find((c) => c.id === cardId);
      if (!card) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - card.position.x,
        y: e.clientY - rect.top - card.position.y,
      });
      setDragId(cardId);
    },
    [conditions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragId) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - NODE_W));
      const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - NODE_H));
      moveCard(dragId, x, y);
    },
    [dragId, dragOffset, moveCard]
  );

  const handleMouseUp = useCallback(() => {
    setDragId(null);
  }, []);

  const handleNodeClick = useCallback(
    (cardId: string) => {
      if (dragId) return;
      if (linkingFrom === cardId) {
        cancelLinking();
        return;
      }
      if (linkingFrom) {
        completeLink(cardId, 'deduction');
      } else {
        startLinking(cardId);
      }
    },
    [linkingFrom, dragId, startLinking, completeLink, cancelLinking]
  );

  const handleLinkClick = useCallback(
    (e: React.MouseEvent, linkId: string) => {
      e.stopPropagation();
      setContextMenu({ linkId, x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleJudge = useCallback(
    (linkId: string, status: 'valid' | 'invalid') => {
      judgeLink(linkId, status);
      setContextMenu(null);
    },
    [judgeLink]
  );

  const handleRemove = useCallback(
    (linkId: string) => {
      removeLink(linkId);
      setContextMenu(null);
    },
    [removeLink]
  );

  const dismissMenu = useCallback(() => {
    setContextMenu(null);
    if (linkingFrom) cancelLinking();
  }, [linkingFrom, cancelLinking]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg border border-amber-800/40">
      <svg
        ref={svgRef}
        className={cn(
          'w-full h-full select-none',
          linkingFrom ? 'cursor-crosshair' : 'cursor-default'
        )}
        style={{
          background:
            'linear-gradient(135deg, #1a0f06 0%, #231509 25%, #1a0f06 50%, #201208 75%, #1a0f06 100%)',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={dismissMenu}
      >
        <defs>
          <pattern id="woodGrain" patternUnits="userSpaceOnUse" width="200" height="200">
            <rect width="200" height="200" fill="none" />
            <line x1="0" y1="20" x2="200" y2="22" stroke="rgba(139,92,30,0.06)" strokeWidth="1" />
            <line x1="0" y1="55" x2="200" y2="53" stroke="rgba(139,92,30,0.04)" strokeWidth="1" />
            <line x1="0" y1="90" x2="200" y2="92" stroke="rgba(139,92,30,0.05)" strokeWidth="1" />
            <line x1="0" y1="130" x2="200" y2="128" stroke="rgba(139,92,30,0.04)" strokeWidth="1" />
            <line x1="0" y1="170" x2="200" y2="172" stroke="rgba(139,92,30,0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#woodGrain)" />

        {logicLinks.map((link) => {
          const from = conditions.find((c) => c.id === link.fromCardId);
          const to = conditions.find((c) => c.id === link.toCardId);
          if (!from || !to) return null;

          const fx = from.position.x + NODE_W / 2;
          const fy = from.position.y + NODE_H / 2;
          const tx = to.position.x + NODE_W / 2;
          const ty = to.position.y + NODE_H / 2;
          const angle = Math.atan2(ty - fy, tx - fx);
          const color = linkColor[link.status];

          const arrowX = tx - (NODE_W / 2 + 4) * Math.cos(angle);
          const arrowY = ty - (NODE_H / 2 + 4) * Math.sin(angle);

          return (
            <g key={link.id} onClick={(e) => handleLinkClick(e, link.id)} className="cursor-pointer">
              <line
                x1={fx}
                y1={fy}
                x2={tx}
                y2={ty}
                stroke={color}
                strokeWidth={2.5}
                strokeDasharray={link.status === 'pending' ? '6 3' : 'none'}
                opacity={0.8}
              />
              <ArrowHead x={arrowX} y={arrowY} angle={angle} color={color} />
              <text
                x={(fx + tx) / 2}
                y={(fy + ty) / 2 - 8}
                textAnchor="middle"
                fill={color}
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
                opacity={0.9}
              >
                {linkLabel[link.status]}
              </text>
            </g>
          );
        })}

        {linkingFrom && (() => {
          const from = conditions.find((c) => c.id === linkingFrom);
          if (!from) return null;
          return (
            <circle
              cx={from.position.x + NODE_W / 2}
              cy={from.position.y + NODE_H / 2}
              r={6}
              fill="#eab308"
              opacity={0.6}
            >
              <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
            </circle>
          );
        })()}

        {canvasCards.map((card) => {
          const isLinking = linkingFrom === card.id;
          const truncated =
            card.content.length > TRUNCATE_LEN
              ? card.content.substring(0, TRUNCATE_LEN) + '...'
              : card.content;
          const borderCol =
            card.source === 'original' ? '#d97706' : '#3b82f6';

          return (
            <g
              key={card.id}
              onMouseDown={(e) => handleMouseDown(e, card.id)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(card.id);
              }}
              className={cn(dragId === card.id ? 'cursor-grabbing' : 'cursor-grab')}
            >
              <rect
                x={card.position.x}
                y={card.position.y}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="#1a0f06"
                stroke={borderCol}
                strokeWidth={isLinking ? 3 : 2}
                strokeDasharray={card.source === 'derived' ? '5 3' : 'none'}
                opacity={0.95}
              />
              {isLinking && (
                <rect
                  x={card.position.x - 2}
                  y={card.position.y - 2}
                  width={NODE_W + 4}
                  height={NODE_H + 4}
                  rx={8}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth={1.5}
                  opacity={0.5}
                >
                  <animate attributeName="opacity" values="0.5;0.15;0.5" dur="1.2s" repeatCount="indefinite" />
                </rect>
              )}
              <text
                x={card.position.x + NODE_W / 2}
                y={card.position.y + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={card.source === 'original' ? '#fbbf24' : '#93c5fd'}
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
              >
                {truncated}
              </text>
            </g>
          );
        })}
      </svg>

      {linkingFrom && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-amber-900/90 border border-amber-600/60 px-3 py-1.5 rounded-md">
          <Link2 className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-amber-300">点击目标节点完成连线，再次点击源节点取消</span>
        </div>
      )}

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 bg-[#2a1a0e] border border-amber-700/60 rounded-md shadow-xl shadow-black/40 py-1 min-w-[120px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleJudge(contextMenu.linkId, 'valid')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-900/30 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              判定有效
            </button>
            <button
              onClick={() => handleJudge(contextMenu.linkId, 'invalid')}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              判定无效
            </button>
            <div className="h-px bg-amber-800/30 mx-2 my-0.5" />
            <button
              onClick={() => handleRemove(contextMenu.linkId)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-amber-500 hover:bg-amber-900/30 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              删除连线
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
