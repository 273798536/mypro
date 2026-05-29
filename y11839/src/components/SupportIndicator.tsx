import { useState } from 'react';
import type { BridgeNode } from '../types';

interface SupportIndicatorProps {
  node: BridgeNode;
  gridSize?: number;
}

export default function SupportIndicator({ node, gridSize = 40 }: SupportIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (node.type !== 'support') return null;

  const left = node.x * gridSize;
  const top = node.y * gridSize;
  const isUnstable = node.isStable === false;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left, top }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="relative flex flex-col items-center -translate-x-1/2">
        <span
          className={`text-lg leading-none select-none ${
            isUnstable ? 'text-orange-400' : 'text-[#3498DB]'
          }`}
          style={{
            filter: isUnstable
              ? 'drop-shadow(0 0 6px #F39C1288)'
              : 'drop-shadow(0 0 4px #3498DB55)',
          }}
        >
          ▲
        </span>

        {isUnstable && (
          <span
            className="absolute -top-3 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white"
            style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
          >
            !
          </span>
        )}

        {showTooltip && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-48 rounded-lg border border-[#1e3a5f] bg-[#0a1628]/95 p-3 shadow-xl backdrop-blur-sm">
            <div className="space-y-1.5 text-xs">
              <div className="text-[#7eb8e0] font-medium border-b border-[#1e3a5f] pb-1 mb-1">
                支座 {node.id}
              </div>

              {node.reactionForce && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#7eb8e0]">水平反力 Fx</span>
                    <span className="text-white font-mono">
                      {node.reactionForce.fx.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7eb8e0]">竖向反力 Fy</span>
                    <span className="text-white font-mono">
                      {node.reactionForce.fy.toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span className="text-[#7eb8e0]">稳定性</span>
                <span className={isUnstable ? 'text-orange-400 font-medium' : 'text-emerald-400'}>
                  {isUnstable ? '不稳定' : '稳定'}
                </span>
              </div>

              {isUnstable && node.instabilityReason && (
                <div className="mt-1 rounded bg-orange-500/10 px-2 py-1 text-orange-300 border border-orange-500/20">
                  {node.instabilityReason}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
