import type { SamplePoint, CommWindow } from "@/types";

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateSamples(seed = 7): SamplePoint[] {
  const rand = seeded(seed);
  const kinds: SamplePoint["kind"][] = ["rock", "soil", "ice"];
  const result: SamplePoint[] = [];
  for (let i = 0; i < 14; i++) {
    const kind = kinds[Math.floor(rand() * 3)];
    const x = (rand() - 0.5) * 60;
    const z = (rand() - 0.5) * 60;
    const weight =
      kind === "ice"
        ? 8 + Math.floor(rand() * 12)
        : kind === "rock"
          ? 5 + Math.floor(rand() * 10)
          : 3 + Math.floor(rand() * 6);
    result.push({
      id: `s-${i}`,
      x,
      z,
      kind,
      weight,
      collected: false,
    });
  }
  return result;
}

export function generateCommWindows(seed = 11): CommWindow[] {
  const rand = seeded(seed);
  const result: CommWindow[] = [];
  for (let i = 0; i < 5; i++) {
    const startT = 5 + Math.floor(rand() * 40);
    const endT = startT + 8 + Math.floor(rand() * 10);
    result.push({
      id: `c-${i}`,
      x: (rand() - 0.5) * 60,
      z: (rand() - 0.5) * 60,
      radius: 5 + rand() * 3,
      startT,
      endT,
      used: false,
    });
  }
  return result;
}
