import type { Clue, EvidenceLink, CorrectLink } from '@/types';

export function validateLink(
  fromClue: Clue,
  toClue: Clue,
  correctLinks: CorrectLink[]
): { isValid: boolean; scoreImpact: number } {
  const key1 = `${fromClue.id}->${toClue.id}`;
  const key2 = `${toClue.id}->${fromClue.id}`;

  const correctKeys = new Set(correctLinks.map((l) => `${l.fromClueId}->${l.toClueId}`));

  if (correctKeys.has(key1) || correctKeys.has(key2)) {
    return { isValid: true, scoreImpact: 8 };
  }

  const bothSampleRelated =
    (fromClue.category === 'SAMPLE' || fromClue.category === 'UNDECLARED') &&
    (toClue.category === 'SAMPLE' || toClue.category === 'UNDECLARED');

  const bothExpiredRelated =
    fromClue.category === 'EXPIRED' && toClue.category === 'EXPIRED';

  const bothCoverRelated =
    fromClue.category === 'COVER' && toClue.category === 'COVER';

  const sameSource = fromClue.sourceId === toClue.sourceId;

  if (sameSource) {
    return { isValid: false, scoreImpact: -5 };
  }

  if (bothSampleRelated || bothExpiredRelated || bothCoverRelated) {
    return { isValid: false, scoreImpact: -2 };
  }

  return { isValid: false, scoreImpact: -5 };
}

export function getSourceTrace(clue: Clue, allClues: Clue[], links: EvidenceLink[]): string[] {
  const traces: string[] = [];

  traces.push(`${getSourceTypeLabel(clue.sourceType)}: ${clue.sourceId}`);

  const relatedLinks = links.filter((l) => l.fromClueId === clue.id || l.toClueId === clue.id);

  for (const link of relatedLinks) {
    const otherClueId = link.fromClueId === clue.id ? link.toClueId : link.fromClueId;
    const otherClue = allClues.find((c) => c.id === otherClueId);
    if (otherClue) {
      traces.push(`关联线索: ${otherClue.content}`);
      traces.push(`来源: ${getSourceTypeLabel(otherClue.sourceType)}: ${otherClue.sourceId}`);
    }
  }

  return traces;
}

export function getSourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SONG_CLIP: '歌曲片段',
    CONTRACT: '授权合同',
    TAKEDOWN: '下架单',
  };
  return labels[type] || type;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    COVER: '翻唱',
    SAMPLE: '采样',
    BGM: '背景音乐',
    EXPIRED: '授权过期',
    UNDECLARED: '未申报',
    NAME_CONFLICT: '同名误判',
  };
  return labels[category] || category;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    COVER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    SAMPLE: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    BGM: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    EXPIRED: 'bg-red-500/20 text-red-300 border-red-500/30',
    UNDECLARED: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    NAME_CONFLICT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  return colors[category] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

export function getDifficultyLabel(d: string): string {
  const labels: Record<string, string> = { easy: '初级', medium: '中级', hard: '高级' };
  return labels[d] || d;
}

export function getDifficultyColor(d: string): string {
  const colors: Record<string, string> = {
    easy: 'bg-emerald-500/20 text-emerald-300',
    medium: 'bg-amber-500/20 text-amber-300',
    hard: 'bg-red-500/20 text-red-300',
  };
  return colors[d] || 'bg-slate-500/20 text-slate-300';
}
