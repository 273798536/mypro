export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return roundTo((part / total) * 100, 1);
}

export function getScoreGrade(score: number, maxScore: number): { grade: string; color: string } {
  const percentage = calculatePercentage(score, maxScore);
  if (percentage >= 90) return { grade: 'S', color: 'text-yellow-400' };
  if (percentage >= 80) return { grade: 'A', color: 'text-emerald-400' };
  if (percentage >= 70) return { grade: 'B', color: 'text-cyan-400' };
  if (percentage >= 60) return { grade: 'C', color: 'text-blue-400' };
  if (percentage >= 50) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'F', color: 'text-red-500' };
}
