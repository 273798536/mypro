import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowLeft } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getStressColor } from '@/utils/physics';
import OverloadModal from '@/components/OverloadModal';

export default function Test() {
  const navigate = useNavigate();
  const nodes = useGameStore((s) => s.nodes);
  const members = useGameStore((s) => s.members);
  const config = useGameStore((s) => s.config);
  const vehiclePosition = useGameStore((s) => s.vehiclePosition);
  const isTestRunning = useGameStore((s) => s.isTestRunning);
  const overloadDisplay = useGameStore((s) => s.overloadDisplay);
  const advanceVehicle = useGameStore((s) => s.advanceVehicle);
  const dismissOverload = useGameStore((s) => s.dismissOverload);
  const testResult = useGameStore((s) => s.testResult);
  const phase = useGameStore((s) => s.phase);

  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const delta = time - lastTimeRef.current;

    if (delta > 200) {
      lastTimeRef.current = time;
      advanceVehicle();
    }

    const state = useGameStore.getState();
    if (state.isTestRunning && !state.overloadDisplay && state.phase === 'testing') {
      animRef.current = requestAnimationFrame(animate);
    }
  }, [advanceVehicle]);

  useEffect(() => {
    if (isTestRunning && !overloadDisplay && phase === 'testing') {
      lastTimeRef.current = 0;
      animRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isTestRunning, overloadDisplay, phase, animate]);

  useEffect(() => {
    if (phase === 'review') {
      navigate('/review');
    }
  }, [phase, navigate]);

  const gs = config.gridSize;
  const svgW = config.gridWidth * gs;
  const svgH = config.gridHeight * gs;
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const vehicleX = vehiclePosition * gs;
  const vehicleY = config.supportY * gs - 20;

  return (
    <div className="h-screen flex flex-col bg-[#0A1628] text-white">
      <div className="h-12 bg-[#0D1F3C] border-b border-[#1F4A6E] flex items-center px-4 gap-4">
        <button
          onClick={() => navigate('/build')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#4A7A9A] hover:text-[#7EB8DA] hover:bg-[#1B3A5C]/50 transition-all"
        >
          <ArrowLeft size={14} />
          返回搭建
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm text-[#7EB8DA] font-semibold">载荷测试中</span>
        </div>
        <div className="text-xs font-mono text-[#4A7A9A]">
          车辆位置: {vehiclePosition.toFixed(1)}m
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full max-w-5xl"
          style={{ maxHeight: 'calc(100vh - 64px)' }}
        >
          <rect width={svgW} height={svgH} fill="#1B3A5C" />

          {Array.from({ length: config.gridWidth + 1 }).map((_, i) => (
            <line key={`v${i}`} x1={i * gs} y1={0} x2={i * gs} y2={svgH} stroke="#1F4A6E" strokeWidth={0.5} />
          ))}
          {Array.from({ length: config.gridHeight + 1 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * gs} x2={svgW} y2={i * gs} stroke="#1F4A6E" strokeWidth={0.5} />
          ))}

          {members.map((m) => {
            const a = nodeMap[m.nodeAId];
            const b = nodeMap[m.nodeBId];
            if (!a || !b) return null;
            return (
              <line
                key={m.id}
                x1={a.x * gs} y1={a.y * gs}
                x2={b.x * gs} y2={b.y * gs}
                stroke={getStressColor(m.stressRatio)}
                strokeWidth={4}
                strokeLinecap="round"
              />
            );
          })}

          {nodes.map((n) => {
            const fill = n.type === 'deck' ? '#E87722' : n.type === 'support' ? '#2ECC71' : '#FFFFFF';
            return (
              <g key={n.id}>
                <circle cx={n.x * gs} cy={n.y * gs} r={7} fill={fill} stroke="#0A1628" strokeWidth={1.5} />
                {n.type === 'support' && (
                  <polygon
                    points={`${n.x * gs},${n.y * gs + 7} ${n.x * gs - 5},${n.y * gs + 14} ${n.x * gs + 5},${n.y * gs + 14}`}
                    fill="#2ECC71" opacity={0.8}
                  />
                )}
              </g>
            );
          })}

          {(isTestRunning || vehiclePosition > 0) && (
            <g>
              <rect
                x={vehicleX - 12} y={vehicleY - 8}
                width={24} height={12}
                rx={3} fill="#E87722" stroke="#D35400" strokeWidth={1}
              />
              <circle cx={vehicleX - 6} cy={vehicleY + 6} r={3} fill="#333" stroke="#555" strokeWidth={0.5} />
              <circle cx={vehicleX + 6} cy={vehicleY + 6} r={3} fill="#333" stroke="#555" strokeWidth={0.5} />
              <line
                x1={vehicleX} y1={vehicleY + 4}
                x2={vehicleX} y2={config.supportY * gs}
                stroke="#E87722" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
              />
              <text x={vehicleX} y={vehicleY - 14} textAnchor="middle" fill="#E87722" fontSize={10} fontFamily="monospace">
                {config.vehicleLoad}kN
              </text>
            </g>
          )}
        </svg>
      </div>

      {overloadDisplay && (
        <OverloadModal overloadDisplay={overloadDisplay} onDismiss={dismissOverload} />
      )}
    </div>
  );
}
