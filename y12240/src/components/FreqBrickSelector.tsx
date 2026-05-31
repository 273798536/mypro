import { useGameStore } from "@/store/gameStore";
import { getBrickById } from "@/config/bricks";
import type { FrequencyBrick } from "@/types/game";

export default function FreqBrickSelector() {
  const availableBricks = useGameStore((s) => s.availableBricks);
  const selectedBrickId = useGameStore((s) => s.selectedBrickId);
  const selectBrick = useGameStore((s) => s.selectBrick);
  const status = useGameStore((s) => s.status);

  const isDisabled = status !== "playing";

  return (
    <div className="flex gap-3 justify-center items-end">
      {availableBricks.map((brick: FrequencyBrick) => {
        const isSelected = selectedBrickId === brick.id;
        return (
          <button
            key={brick.id}
            onClick={() => selectBrick(isSelected ? null : brick.id)}
            disabled={isDisabled}
            className={`
              relative group flex flex-col items-center justify-center
              w-20 h-20 rounded-xl border-2 transition-all duration-200
              ${isSelected
                ? "scale-110 border-white/60 shadow-lg"
                : "border-transparent hover:scale-105"
              }
              ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{
              backgroundColor: `${brick.color}20`,
              boxShadow: isSelected
                ? `0 0 24px ${brick.glowColor}, inset 0 0 12px ${brick.glowColor}`
                : `0 0 8px ${brick.glowColor}`,
              borderColor: isSelected ? brick.color : "transparent",
            }}
          >
            <div
              className="absolute inset-1 rounded-lg opacity-30"
              style={{ backgroundColor: brick.color }}
            />
            <span className="relative text-xs font-bold" style={{ color: brick.color }}>
              {brick.label}
            </span>
            <span className="relative text-[9px] text-[#6688aa] mt-1">
              {brick.freqRange[0]}-{brick.freqRange[1]}Hz
            </span>
            <span className="relative text-[8px] text-[#445566] mt-0.5">
              {brick.version}
            </span>
            {isSelected && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: brick.color, boxShadow: `0 0 8px ${brick.glowColor}` }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
