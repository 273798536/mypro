import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

const keyMap: Record<string, string> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  q: "fill",
  Q: "fill",
  e: "drain",
  E: "drain",
};

export function useKeyboard() {
  const setActiveInput = useGameStore((s) => s.setActiveInput);
  const engine = useGameStore((s) => s.engine);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engine.phase !== "playing") return;
      const key = keyMap[e.key];
      if (key) {
        e.preventDefault();
        setActiveInput({ [key]: true });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = keyMap[e.key];
      if (key) {
        e.preventDefault();
        setActiveInput({ [key]: false });
      }
    };

    const handleBlur = () => {
      const allKeys = Object.values(keyMap);
      const uniqueKeys = [...new Set(allKeys)];
      const reset: Record<string, boolean> = {};
      uniqueKeys.forEach((k) => {
        reset[k] = false;
      });
      setActiveInput(reset);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [engine.phase, setActiveInput]);
}
