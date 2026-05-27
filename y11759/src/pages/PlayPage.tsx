import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CanvasStage from '../components/CanvasStage';
import HUD from '../components/HUD';
import ControlPanel from '../components/ControlPanel';
import { OrbitEngine } from '../game/engine';
import { getLevel } from '../game/levels';
import { computeScore } from '../game/scoring';
import { saveRun } from '../game/storage';
import type { GameEvent, RunRecord } from '../game/types';

const PlayPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const nav = useNavigate();
  const level = getLevel(levelId ?? '');

  const engineRef = useRef<OrbitEngine | null>(null);
  const [snapshot, setSnapshot] = useState<ReturnType<OrbitEngine['snapshot']> | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [thrust, setThrust] = useState(0);
  const [angle, setAngle] = useState(0);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  const init = useCallback(() => {
    if (!level) return;
    const e = new OrbitEngine(level);
    engineRef.current = e;
    setSnapshot(e.snapshot());
    setEvents([]);
    setThrust(0);
    setAngle(Math.atan2(level.start.vy, level.start.vx));
    setPaused(false);
    setRunId(null);
  }, [level]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!engineRef.current || paused) return;
      const e2 = engineRef.current;
      if (e2.isEnded()) {
        const result = e2.getResult();
        if (result && !runId) {
          const frames = e2.getFrames();
          const evts = e2.getEvents();
          const score = computeScore(level!, result, frames, evts, e2.getEnterSpeedMap());
          const record: RunRecord = {
            id: crypto.randomUUID(),
            levelId: levelId!,
            startTime: Date.now(),
            endTime: Date.now(),
            result,
            frames,
            events: evts,
            score,
            failureReason: e2.getFailureReason(),
          };
          saveRun(record);
          setRunId(record.id);
          setTimeout(() => nav(`/result/${record.id}`), 600);
        }
        return;
      }
      e2.setControls(thrust, angle);
      e2.step();
      setSnapshot(e2.snapshot());
      const newEvents = e2.getEvents();
      if (newEvents.length > events.length) {
        setEvents(newEvents);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level, levelId, nav, paused, thrust, angle, events.length, runId]);

  if (!level) {
    return <div className="min-h-screen bg-slate-950 text-white p-8">关卡不存在</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white">
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => nav('/')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{level.name}</h1>
      </div>
      <div className="px-4 pb-8 flex gap-6 items-start">
        <div className="flex-shrink-0">
          {snapshot && <CanvasStage level={level} snapshot={snapshot} />}
        </div>
        <div className="flex-1 max-w-xs space-y-4">
          {snapshot && <HUD snapshot={snapshot} levelId={levelId!} />}
          <ControlPanel
            thrust={thrust}
            angle={angle}
            paused={paused}
            events={events}
            onThrustChange={setThrust}
            onAngleChange={setAngle}
            onTogglePause={() => setPaused(!paused)}
            onRestart={init}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayPage;
