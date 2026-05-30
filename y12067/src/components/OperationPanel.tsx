import { useGameStore } from "@/store/gameStore";
import type { FloorPlan } from "@/types";
import { Radio, Power, ArrowRightLeft } from "lucide-react";
import { useState } from "react";

interface OperationPanelProps {
  floors: FloorPlan[];
}

export default function OperationPanel({ floors }: OperationPanelProps) {
  const { sendBroadcast, toggleElevator, elevatorStates, scenario } = useGameStore();
  const [selectedFloor, setSelectedFloor] = useState<string>(floors[0]?.id ?? "");
  const [broadcastExit, setBroadcastExit] = useState<string>("");
  const [redirectFrom, setRedirectFrom] = useState<string>("");
  const [redirectTo, setRedirectTo] = useState<string>("");

  const currentFloor = floors.find((f) => f.id === selectedFloor);

  const handleBroadcast = () => {
    if (!selectedFloor || !broadcastExit) return;
    sendBroadcast(selectedFloor, broadcastExit);
  };

  const handleElevatorToggle = (elevId: string, current: boolean) => {
    toggleElevator(elevId, current);
  };

  const handleRedirect = () => {
    if (!selectedFloor || !redirectFrom || !redirectTo || redirectFrom === redirectTo) return;
    useGameStore.getState().redirectExit(selectedFloor, redirectFrom, redirectTo);
  };

  return (
    <div className="bg-bg-light/80 backdrop-blur-sm rounded-lg border border-gray-700/40 p-3 space-y-3">
      <div className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
        <Radio size={12} className="text-accent" />
        操作面板
      </div>

      <div>
        <label className="text-[10px] text-gray-500 block mb-1">当前楼层</label>
        <select
          value={selectedFloor}
          onChange={(e) => setSelectedFloor(e.target.value)}
          className="w-full bg-bg border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-accent focus:outline-none"
        >
          {floors.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {currentFloor && (
        <>
          <div className="border-t border-gray-700/50 pt-2 space-y-2">
            <div className="text-[10px] text-accent font-medium flex items-center gap-1">
              <Radio size={10} />
              发送疏散广播
            </div>
            <select
              value={broadcastExit}
              onChange={(e) => setBroadcastExit(e.target.value)}
              className="w-full bg-bg border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-accent focus:outline-none"
            >
              <option value="">-- 选择目标出口 --</option>
              {currentFloor.exits
                .filter((e) => e.status !== "blocked")
                .map((exit) => (
                  <option key={exit.id} value={exit.id}>
                    {exit.direction}向出口 {exit.note ? `(⚠ ${exit.note.slice(0, 15)})` : ""}
                  </option>
                ))}
            </select>
            <button
              onClick={handleBroadcast}
              disabled={!broadcastExit}
              className="w-full bg-accent hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium text-xs py-2 px-3 rounded transition-all active:scale-95"
            >
              广播：前往该出口
            </button>
          </div>

          <div className="border-t border-gray-700/50 pt-2 space-y-2">
            <div className="text-[10px] text-warn font-medium flex items-center gap-1">
              <Power size={10} />
              电梯管控
            </div>
            {currentFloor.elevators.map((elev) => {
              const isOn = elevatorStates[elev.id] !== false;
              return (
                <div key={elev.id} className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">{elev.id}</span>
                  <button
                    onClick={() => handleElevatorToggle(elev.id, isOn)}
                    className={`text-xs px-3 py-1 rounded transition-all active:scale-95 ${
                      isOn
                        ? "bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
                        : "bg-safe/20 text-safe border border-safe/40 hover:bg-safe/30"
                    }`}
                  >
                    {isOn ? "停用" : "启用"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-700/50 pt-2 space-y-2">
            <div className="text-[10px] text-info font-medium flex items-center gap-1">
              <ArrowRightLeft size={10} />
              出口引导
            </div>
            <select
              value={redirectFrom}
              onChange={(e) => setRedirectFrom(e.target.value)}
              className="w-full bg-bg border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-accent focus:outline-none"
            >
              <option value="">-- 从哪个出口 --</option>
              {currentFloor.exits.map((exit) => (
                <option key={exit.id} value={exit.id}>
                  {exit.direction}向
                </option>
              ))}
            </select>
            <select
              value={redirectTo}
              onChange={(e) => setRedirectTo(e.target.value)}
              className="w-full bg-bg border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:border-accent focus:outline-none"
            >
              <option value="">-- 引导至哪个出口 --</option>
              {currentFloor.exits
                .filter((e) => e.id !== redirectFrom)
                .map((exit) => (
                  <option key={exit.id} value={exit.id}>
                    {exit.direction}向
                  </option>
                ))}
            </select>
            <button
              onClick={handleRedirect}
              disabled={!redirectFrom || !redirectTo || redirectFrom === redirectTo}
              className="w-full bg-info/80 hover:bg-info disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium text-xs py-2 px-3 rounded transition-all active:scale-95"
            >
              引导分流
            </button>
          </div>
        </>
      )}

      {scenario?.dataIssues && scenario.dataIssues.length > 0 && (
        <div className="border-t border-gray-700/50 pt-2">
          <div className="text-[10px] text-warn font-medium mb-1">⚠ 数据异常</div>
          {scenario.dataIssues.map((issue, i) => (
            <div key={i} className="text-[10px] text-gray-400 leading-relaxed">
              · {issue.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
