import type { DiffSegment } from "@/types";

function toChars(s: string): string[] {
  return Array.from(s);
}

function buildLcs(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  return dp;
}

export function diffChars(before: string, after: string): DiffSegment[] {
  const a = toChars(before);
  const b = toChars(after);
  const dp = buildLcs(a, b);
  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  let buffer = "";
  let kind: DiffSegment["kind"] | null = null;

  const flush = () => {
    if (buffer && kind) {
      segments.push({ kind, text: buffer });
      buffer = "";
    }
  };

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      if (kind && kind !== "equal") flush();
      kind = "equal";
      buffer += a[i];
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      if (kind && kind !== "del") flush();
      kind = "del";
      buffer += a[i];
      i++;
    } else {
      if (kind && kind !== "add") flush();
      kind = "add";
      buffer += b[j];
      j++;
    }
  }
  while (i < a.length) {
    if (kind && kind !== "del") flush();
    kind = "del";
    buffer += a[i];
    i++;
  }
  while (j < b.length) {
    if (kind && kind !== "add") flush();
    kind = "add";
    buffer += b[j];
    j++;
  }
  flush();
  return segments;
}

export function highlightSegments(segments: DiffSegment[], mode: "before" | "after"): DiffSegment[] {
  if (mode === "before") {
    return segments.filter((s) => s.kind !== "add");
  }
  return segments.filter((s) => s.kind !== "del");
}

export function hasDifference(before: string, after: string): boolean {
  return before.trim() !== after.trim();
}
