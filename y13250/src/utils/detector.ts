import type { Material, MaterialVersion, Point, MergeRelation } from '@/types';
import { isAdjacentIntersection, isContainment, similarityRatio } from './similarity';

export function detectCaliberChanged(versions: MaterialVersion[]): { changed: boolean; diffPoints: string[] } {
  if (versions.length < 2) return { changed: false, diffPoints: [] };
  const latest = versions[versions.length - 1];
  const prev = versions[versions.length - 2];
  const latestMentions = new Set(latest.pointMentions);
  const prevMentions = new Set(prev.pointMentions);
  const diff: string[] = [];
  latestMentions.forEach(p => { if (!prevMentions.has(p)) diff.push(p); });
  prevMentions.forEach(p => { if (!latestMentions.has(p)) diff.push(p); });

  const contentDiff = similarityRatio(prev.content, latest.content);
  const changed = contentDiff < 0.7 || diff.length > 0;
  return { changed, diffPoints: diff };
}

export function detectAdjacentConflicts(points: Point[]): Array<{ a: string; b: string }> {
  const conflicts: Array<{ a: string; b: string }> = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (isAdjacentIntersection(points[i].name, points[j].name)) {
        conflicts.push({ a: points[i].id, b: points[j].id });
      }
    }
  }
  return conflicts;
}

export function suggestMergePairs(points: Point[]): Array<{
  a: string;
  b: string;
  confidence: number;
  reason: 'name_similarity' | 'containment' | 'alias';
  forcePending: boolean;
}> {
  const pairs: Array<any> = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const pA = points[i];
      const pB = points[j];
      let conf = 0;
      let reason: any = null;
      let forcePending = isAdjacentIntersection(pA.name, pB.name);

      const allNamesA = [pA.name, ...pA.aliases];
      const allNamesB = [pB.name, ...pB.aliases];

      outer:
      for (const na of allNamesA) {
        for (const nb of allNamesB) {
          if (na === nb) {
            conf = 1;
            reason = 'alias';
            break outer;
          }
          if (isContainment(na, nb) && Math.min(na.length, nb.length) >= 3) {
            const c = similarityRatio(na, nb);
            if (c > conf) { conf = c; reason = 'containment'; }
          }
          const sim = similarityRatio(na, nb);
          if (sim > 0.7 && sim > conf) {
            conf = sim;
            reason = 'name_similarity';
          }
        }
      }

      if (conf >= 0.7 || forcePending) {
        pairs.push({
          a: pA.id,
          b: pB.id,
          confidence: forcePending ? Math.max(conf, 0.5) : conf,
          reason: reason || 'name_similarity',
          forcePending,
        });
      }
    }
  }
  return pairs;
}

export function computeMergeGroupCanonical(points: Point[]): string {
  if (points.length === 0) return '';
  return points.reduce((best, p) => (p.name.length > best.length ? p.name : best), points[0].name);
}
