import type { RiskNote, FinalConclusion } from '../types';
import { fmtDay } from './format';

export function noteDedupeKey(partId: string, createdAt: number): string {
  return partId + Math.floor(createdAt / 60000);
}

export function conclusionDedupeKey(partId: string, finalizedAt: number): string {
  return partId + fmtDay(finalizedAt);
}

export function findDuplicateNote(notes: RiskNote[], partId: string, createdAt: number): RiskNote | null {
  const key = noteDedupeKey(partId, createdAt);
  for (const n of notes) {
    if (!n.is_misread && noteDedupeKey(n.part_id, n.created_at) === key) {
      return n;
    }
  }
  return null;
}

export function findDuplicateConclusion(conclusions: FinalConclusion[], partId: string, finalizedAt: number): FinalConclusion | null {
  const key = conclusionDedupeKey(partId, finalizedAt);
  for (const c of conclusions) {
    if (conclusionDedupeKey(c.part_id, c.finalized_at) === key) {
      return c;
    }
  }
  return null;
}
