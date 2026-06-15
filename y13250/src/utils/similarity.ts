export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function similarityRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const ADJ_WORDS = ['东', '西', '南', '北', '东北', '东南', '西北', '西南'];
const ROAD_WORDS = ['路口', '转角', '交叉口', '拐角'];

export function isAdjacentIntersection(nameA: string, nameB: string): boolean {
  const hasRoadA = ROAD_WORDS.some(w => nameA.includes(w));
  const hasRoadB = ROAD_WORDS.some(w => nameB.includes(w));
  if (!hasRoadA || !hasRoadB) return false;

  const stripAdj = (s: string) => {
    let out = s;
    ADJ_WORDS.forEach(w => { out = out.split(w).join(''); });
    ROAD_WORDS.forEach(w => { out = out.split(w).join('#'); });
    return out.replace(/\s+/g, '');
  };

  const baseA = stripAdj(nameA);
  const baseB = stripAdj(nameB);
  return baseA === baseB && nameA !== nameB;
}

export function isContainment(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}
