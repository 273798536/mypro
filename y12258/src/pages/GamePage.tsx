import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { PhysicsEngine } from '../engine/PhysicsEngine';
import { BridgeCanvas } from '../components/BridgeCanvas';
import { ControlPanel } from '../components/ControlPanel';
import { VibrationChart } from '../components/VibrationChart';
import { EvidenceTimeline } from '../components/EvidenceTimeline';
import { ResultPanel } from '../components/ResultPanel';
import { LevelSelect } from '../components/LevelSelect';

export const GamePage: React.FC = () => {
  const {
    phase,
    nodes,
    members,
    windLevel,
    targetWindLevel,
    setWindLevel,
    addVibrationFrame,
    setGameOver,
    vibrationHistory
  } = useGameStore();

  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const animationFrameRef = useRef<number>();
  const lastWindIncreaseRef = useRef<number>(0);
  const [windFrequency] = useState(0.8 + Math.random() * 0.4);

  useEffect(() => {
    if (phase === 'simulating') {
      physicsEngineRef.current = new PhysicsEngine(
        JSON.parse(JSON.stringify(nodes)),
        JSON.parse(JSON.stringify(members))
      );
      lastWindIncreaseRef.current = Date.now();
    } else {
      physicsEngineRef.current = null;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'simulating' || !physicsEngineRef.current) return;

    const engine = physicsEngineRef.current;
    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const windForce = windLevel * 120;
      const frame = engine.update(dt, windForce, windFrequency);
      addVibrationFrame(frame);

      const overloadCheck = engine.checkOverload();
      if (overloadCheck.overloaded) {
        setGameOver(false, 'overload', `杆件 ${overloadCheck.memberId} 应力过载！应力: ${overloadCheck.stress?.toFixed(1)}`);
        return;
      }

      if (engine.checkResonance(windFrequency, vibrationHistory)) {
        setGameOver(false, 'resonance', '共振检测！桥梁振幅过大导致结构破坏');
        return;
      }

      const now = Date.now();
      if (now - lastWindIncreaseRef.current > 5000) {
        if (windLevel < targetWindLevel) {
          setWindLevel(windLevel + 1);
          lastWindIncreaseRef.current = now;
        } else {
          setGameOver(true);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, windLevel, targetWindLevel, windFrequency, vibrationHistory]);

  if (phase === 'menu') {
    return <LevelSelect />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                <span className="text-cyan-400">桥梁振动</span>塔防
              </h1>
              <p className="text-slate-400 text-sm">
                {phase === 'edit' ? '编辑模式 - 调整桥梁结构' : 
                 phase === 'simulating' ? '模拟进行中...' : '游戏结束'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-400 text-xs">状态</p>
                <p className={`font-bold ${
                  phase === 'edit' ? 'text-blue-400' :
                  phase === 'simulating' ? 'text-cyan-400 animate-pulse' :
                  phase === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {phase === 'edit' ? '编辑中' :
                   phase === 'simulating' ? '模拟中' :
                   phase === 'success' ? '成功' : '失败'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
              <BridgeCanvas physicsEngine={physicsEngineRef.current} />
            </div>
            
            {phase === 'simulating' && (
              <VibrationChart />
            )}
            
            {phase === 'simulating' && (
              <EvidenceTimeline />
            )}
          </div>

          <div className="lg:col-span-1">
            <ControlPanel />
          </div>
        </div>
      </div>

      {(phase === 'success' || phase === 'failed') && (
        <ResultPanel />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};
