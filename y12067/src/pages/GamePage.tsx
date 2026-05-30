import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import FloorMap from "@/components/FloorMap";
import OperationPanel from "@/components/OperationPanel";
import EventLog from "@/components/EventLog";
import ExitFlowPanel from "@/components/ExitFlowPanel";
import ScoreBoard from "@/components/ScoreBoard";
import { Pause, Play, RotateCcw, Flag } from "lucide-react";

export default function GamePage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeFloorIndex, setActiveFloorIndex] = useState(0);

  const {
    scenario,
    crowdState,
    exitFlows,
    evacuated,
    totalPeople,
    elapsed,
    running,
    finished,
    events,
    score,
    loadScenario,
    startGame,
    tick,
    pauseGame,
    resumeGame,
    finishGame,
    resetGame,
  } = useGameStore();

  useEffect(() => {
    if (scenarioId) {
      loadScenario(scenarioId);
    }
  }, [scenarioId, loadScenario]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [running, tick]);

  useEffect(() => {
    if (finished && scenario) {
      navigate(`/result/${scenario.id}`);
    }
  }, [finished, scenario, navigate]);

  if (!scenario) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  const currentFloor = scenario.floors[activeFloorIndex];
  const floorCrowd = crowdState.filter((p) => p.floorId === currentFloor?.id);
  const floorExits = exitFlows.filter((f) =>
    currentFloor?.exits.some((e) => e.id === f.exitId)
  );
  const fireRadius = currentFloor
    ? currentFloor.fireSource.radius + 0.05 * elapsed
    : 3;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-gray-700/40 bg-bg-light/50 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-gray-200">
              {scenario.name}
            </h1>
            <div className="flex items-center gap-1">
              {scenario.floors.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFloorIndex(i)}
                  className={`text-[10px] px-2 py-1 rounded transition-all ${
                    i === activeFloorIndex
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-bg border border-gray-700/40 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <ScoreBoard
            elapsed={elapsed}
            timeLimit={scenario.timeLimit}
            evacuated={evacuated}
            totalPeople={totalPeople}
            score={score}
            running={running}
          />
        </div>
      </header>

      <main className="flex-1 flex">
        <div className="flex-1 p-4 flex flex-col gap-3">
          {currentFloor && (
            <FloorMap
              floor={currentFloor}
              crowdState={floorCrowd}
              exitFlows={floorExits}
              fireRadius={fireRadius}
            />
          )}

          <div className="flex items-center gap-2 justify-center">
            {!running && elapsed === 0 && (
              <button
                onClick={startGame}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white font-medium text-xs py-2 px-5 rounded transition-all active:scale-95 animate-pulse-glow"
              >
                <Play size={14} />
                开始演练
              </button>
            )}
            {running && (
              <button
                onClick={pauseGame}
                className="flex items-center gap-1.5 bg-warn/80 hover:bg-warn text-white font-medium text-xs py-2 px-4 rounded transition-all active:scale-95"
              >
                <Pause size={14} />
                暂停
              </button>
            )}
            {!running && elapsed > 0 && !finished && (
              <button
                onClick={resumeGame}
                className="flex items-center gap-1.5 bg-safe/80 hover:bg-safe text-white font-medium text-xs py-2 px-4 rounded transition-all active:scale-95"
              >
                <Play size={14} />
                继续
              </button>
            )}
            {!finished && elapsed > 0 && (
              <button
                onClick={finishGame}
                className="flex items-center gap-1.5 bg-danger/80 hover:bg-danger text-white font-medium text-xs py-2 px-4 rounded transition-all active:scale-95"
              >
                <Flag size={14} />
                结束演练
              </button>
            )}
            <button
              onClick={resetGame}
              className="flex items-center gap-1.5 bg-gray-600/50 hover:bg-gray-600 text-gray-300 text-xs py-2 px-4 rounded transition-all active:scale-95"
            >
              <RotateCcw size={14} />
              重置
            </button>
          </div>

          <EventLog events={events} />
        </div>

        <aside className="w-72 border-l border-gray-700/40 p-3 space-y-3 overflow-y-auto">
          <OperationPanel floors={scenario.floors} />
          <ExitFlowPanel exitFlows={exitFlows} floors={scenario.floors} />
        </aside>
      </main>
    </div>
  );
}
