import { useGameStore } from "@/store/gameStore";
import { Pause, Play, RotateCcw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PauseOverlay() {
  const status = useGameStore((s) => s.status);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const restartGame = useGameStore((s) => s.restartGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const navigate = useNavigate();

  if (status !== "paused") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 p-10 rounded-2xl border border-[#1a1a3a] bg-[#0a0a1a]/90 shadow-2xl">
        <h2 className="text-2xl font-bold text-white font-['Orbitron']">暂停</h2>
        <div className="flex flex-col gap-3 w-48">
          <button
            onClick={resumeGame}
            className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#33ff99]/10 border border-[#33ff99]/30 text-[#33ff99] hover:bg-[#33ff99]/20 transition-all"
          >
            <Play size={18} />
            <span>继续</span>
          </button>
          <button
            onClick={restartGame}
            className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#3366ff]/10 border border-[#3366ff]/30 text-[#3366ff] hover:bg-[#3366ff]/20 transition-all"
          >
            <RotateCcw size={18} />
            <span>重开</span>
          </button>
          <button
            onClick={() => {
              resetGame();
              navigate("/");
            }}
            className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#6688aa]/10 border border-[#6688aa]/30 text-[#6688aa] hover:bg-[#6688aa]/20 transition-all"
          >
            <Home size={18} />
            <span>返回主页</span>
          </button>
        </div>
      </div>
    </div>
  );
}
