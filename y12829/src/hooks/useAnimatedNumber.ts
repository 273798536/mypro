import { useEffect, useState } from "react";

export function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const startValue = value;
    const diff = target - startValue;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(startValue + diff * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
