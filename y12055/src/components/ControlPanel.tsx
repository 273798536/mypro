import { useGameStore } from "@/store/gameStore";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Droplets,
  Wind,
  Play,
  Pause,
  RotateCcw,
  Gem,
} from "lucide-react";

export default function ControlPanel() {
  const engine = useGameStore((s) => s.engine);
  const setActiveInput = useGameStore((s) => s.setActiveInput);
  const resetInput = useGameStore((s) => s.resetInput);
  const startGame = useGameStore((s) => s.startGame);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const resumeGame = useGameStore((s) => s.resumeGame);
  const initGame = useGameStore((s) => s.initGame);
  const addTreasureMode = useGameStore((s) => s.addTreasureMode);

  const isPlaying = engine.phase === "playing";
  const isEnded = engine.phase === "ended";

  const handlePress = (key: string) => {
    setActiveInput({ [key]: true });
  };

  const handleRelease = (key: string) => {
    setActiveInput({ [key]: false });
  };

  const btnClass = (active: boolean) =>
    `select-none rounded-lg p-3 text-sm font-bold transition-all duration-100 active:scale-95 ${
      active
        ? "bg-[#3e92cc] text-white shadow-lg shadow-[#3e92cc]/30"
        : "bg-[#1a2a3a] text-[#8899aa] hover:bg-[#223344] hover:text-[#aabbcc]"
    }`;

  return (
    <div className="space-y-3">
      {engine.phase === "idle" && (
        <div className="flex gap-2">
          <button
            onClick={startGame}
            className="flex-1 flex items-center justify-center gap-2 bg-[#4cd137] text-[#0a1628] font-bold py-3 rounded-lg hover:bg-[#5de448] active:scale-95 transition-all"
          >
            <Play size={18} />
            开始游戏
          </button>
          <button
            onClick={addTreasureMode}
            className="flex-1 flex items-center justify-center gap-2 bg-[#e9b44c] text-[#0a1628] font-bold py-3 rounded-lg hover:bg-[#f0c45e] active:scale-95 transition-all"
          >
            <Gem size={18} />
            含宝箱模式
          </button>
        </div>
      )}

      {isPlaying && (
        <button
          onClick={() => {
            pauseGame();
            resetInput();
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#ffa500] text-[#0a1628] font-bold py-2 rounded-lg hover:bg-[#ffb520] active:scale-95 transition-all"
        >
          <Pause size={16} />
          暂停
        </button>
      )}

      {engine.phase === "paused" && (
        <button
          onClick={resumeGame}
          className="w-full flex items-center justify-center gap-2 bg-[#4cd137] text-[#0a1628] font-bold py-2 rounded-lg hover:bg-[#5de448] active:scale-95 transition-all"
        >
          <Play size={16} />
          继续
        </button>
      )}

      {isEnded && (
        <button
          onClick={() => initGame(engine.settings)}
          className="w-full flex items-center justify-center gap-2 bg-[#3e92cc] text-white font-bold py-2 rounded-lg hover:bg-[#4da3dd] active:scale-95 transition-all"
        >
          <RotateCcw size={16} />
          重新开始
        </button>
      )}

      {(isPlaying || engine.phase === "paused") && (
        <>
          <div>
            <div className="text-[10px] text-[#667788] uppercase tracking-wider mb-1.5">
              方向控制
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div />
              <button
                className={btnClass(false)}
                onMouseDown={() => handlePress("up")}
                onMouseUp={() => handleRelease("up")}
                onMouseLeave={() => handleRelease("up")}
                onTouchStart={() => handlePress("up")}
                onTouchEnd={() => handleRelease("up")}
              >
                <ArrowUp size={18} className="mx-auto" />
              </button>
              <div />
              <button
                className={btnClass(false)}
                onMouseDown={() => handlePress("left")}
                onMouseUp={() => handleRelease("left")}
                onMouseLeave={() => handleRelease("left")}
                onTouchStart={() => handlePress("left")}
                onTouchEnd={() => handleRelease("left")}
              >
                <ArrowLeft size={18} className="mx-auto" />
              </button>
              <button
                className={btnClass(false)}
                onMouseDown={() => handlePress("down")}
                onMouseUp={() => handleRelease("down")}
                onMouseLeave={() => handleRelease("down")}
                onTouchStart={() => handlePress("down")}
                onTouchEnd={() => handleRelease("down")}
              >
                <ArrowDown size={18} className="mx-auto" />
              </button>
              <button
                className={btnClass(false)}
                onMouseDown={() => handlePress("right")}
                onMouseUp={() => handleRelease("right")}
                onMouseLeave={() => handleRelease("right")}
                onTouchStart={() => handlePress("right")}
                onTouchEnd={() => handleRelease("right")}
              >
                <ArrowRight size={18} className="mx-auto" />
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#667788] uppercase tracking-wider mb-1.5">
              压载舱控制
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex items-center justify-center gap-1.5 bg-[#1a2a3a] text-[#3e92cc] font-bold py-2.5 rounded-lg hover:bg-[#223344] active:scale-95 transition-all"
                onMouseDown={() => handlePress("fill")}
                onMouseUp={() => handleRelease("fill")}
                onMouseLeave={() => handleRelease("fill")}
                onTouchStart={() => handlePress("fill")}
                onTouchEnd={() => handleRelease("fill")}
              >
                <Droplets size={16} />
                注水
              </button>
              <button
                className="flex items-center justify-center gap-1.5 bg-[#1a2a3a] text-[#5dade2] font-bold py-2.5 rounded-lg hover:bg-[#223344] active:scale-95 transition-all"
                onMouseDown={() => handlePress("drain")}
                onMouseUp={() => handleRelease("drain")}
                onMouseLeave={() => handleRelease("drain")}
                onTouchStart={() => handlePress("drain")}
                onTouchEnd={() => handleRelease("drain")}
              >
                <Wind size={16} />
                排水
              </button>
            </div>
          </div>

          <div className="text-[10px] text-[#556677] bg-[#0d1f33] rounded p-2">
            键盘: WASD/方向键移动, Q注水, E排水
          </div>
        </>
      )}
    </div>
  );
}
