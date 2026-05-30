import GameCanvas from "@/components/GameCanvas";
import Dashboard from "@/components/Dashboard";
import FormulaPanel from "@/components/FormulaPanel";
import ControlPanel from "@/components/ControlPanel";
import OperationLogPanel from "@/components/OperationLogPanel";
import ReplayPanel from "@/components/ReplayPanel";
import ComparisonTable from "@/components/ComparisonTable";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useGameStore } from "@/store/gameStore";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Anchor } from "lucide-react";

export default function GamePage() {
  const engine = useGameStore((s) => s.engine);
  const session = useGameStore((s) => s.session);
  const savedSessions = useGameStore((s) => s.savedSessions);
  const navigate = useNavigate();

  useGameLoop();
  useKeyboard();

  const isEnded = engine.phase === "ended";
  const hasTreasure = engine.treasureChest !== null;
  const hasComparisonData =
    savedSessions.length > 0 ||
    (session && savedSessions.length > 0);

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#1b4965]/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-[#1a2a3a] text-[#667788] hover:text-[#8899aa] transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <Anchor size={18} className="text-[#3e92cc]" />
          <h1
            className="text-sm font-bold text-[#e9b44c]"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            浮力潜艇寻宝
          </h1>
          {hasTreasure && (
            <span className="text-[9px] bg-[#e9b44c]/20 text-[#e9b44c] px-1.5 py-0.5 rounded-full font-bold">
              含宝箱
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              engine.phase === "playing"
                ? "bg-[#4cd137]/20 text-[#4cd137]"
                : engine.phase === "paused"
                  ? "bg-[#ffa500]/20 text-[#ffa500]"
                  : engine.phase === "ended"
                    ? "bg-[#d8315b]/20 text-[#d8315b]"
                    : "bg-[#8899aa]/20 text-[#8899aa]"
            }`}
          >
            {engine.phase === "playing"
              ? "进行中"
              : engine.phase === "paused"
                ? "已暂停"
                : engine.phase === "ended"
                  ? "已结束"
                  : "准备"}
          </span>
          <span className="text-[10px] text-[#556677] font-mono">
            F#{engine.frame}
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-[7] relative p-2">
          <GameCanvas />
        </div>

        <div className="flex-[3] min-w-[280px] max-w-[360px] border-l border-[#1b4965]/30 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          <ControlPanel />
          <Dashboard />
          <FormulaPanel />
          <OperationLogPanel />
          {isEnded && <ReplayPanel />}
          {hasComparisonData && <ComparisonTable />}
        </div>
      </div>
    </div>
  );
}
