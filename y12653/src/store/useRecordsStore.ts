import { create } from 'zustand';
import type { RiskNote, FinalConclusion, MisreadReason, ClipPlanes } from '../types';
import { loadLS, saveLS } from '../utils/storage';
import { findDuplicateNote, findDuplicateConclusion } from '../utils/dedupe';

interface RecordsState {
  riskNotes: RiskNote[];
  conclusions: FinalConclusion[];
}

interface RecordsActions {
  addRiskNote: (
    payload: Omit<
      RiskNote,
      'id' | 'is_duplicate' | 'duplicate_of' | 'is_misread' | 'misread_reason' | 'conclusion_id'
    >
  ) => { note: RiskNote; duplicated: boolean };
  markMisread: (id: string, reason: MisreadReason) => void;
  finalizeConclusion: (
    payload: Omit<FinalConclusion, 'id' | 'is_supplement' | 'supplements'> & { supplements?: string }
  ) => { conclusion: FinalConclusion; merged: boolean };
  jumpTo3D: (noteIdOrConclusionId: string) => { route: string; partId: string; clip: ClipPlanes };
}

function uid(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

const initialNotes = loadLS<RiskNote[]>('risk_notes', []);
const initialConclusions = loadLS<FinalConclusion[]>('conclusions', []);

export const useRecordsStore = create<RecordsState & RecordsActions>((set, get) => ({
  riskNotes: initialNotes,
  conclusions: initialConclusions,
  addRiskNote: (payload) => {
    const dup = findDuplicateNote(get().riskNotes, payload.part_id, payload.created_at);
    const note: RiskNote = {
      id: uid('note'),
      is_misread: false,
      misread_reason: null,
      conclusion_id: null,
      is_duplicate: dup !== null,
      duplicate_of: dup ? dup.id : null,
      ...payload,
    };
    const next = [...get().riskNotes, note];
    saveLS('risk_notes', next);
    set({ riskNotes: next });
    return { note, duplicated: note.is_duplicate };
  },
  markMisread: (id, reason) => {
    const next = get().riskNotes.map((n) =>
      n.id === id ? { ...n, is_misread: true, misread_reason: reason } : n
    );
    saveLS('risk_notes', next);
    set({ riskNotes: next });
  },
  finalizeConclusion: (payload) => {
    const dup = findDuplicateConclusion(get().conclusions, payload.part_id, payload.finalized_at);
    if (dup) {
      const mergedIds = Array.from(new Set([...dup.linked_note_ids, ...payload.linked_note_ids]));
      const updated: FinalConclusion = {
        ...dup,
        summary: payload.summary,
        verdict: payload.verdict,
        finalized_at: payload.finalized_at,
        finalized_by: payload.finalized_by,
        linked_note_ids: mergedIds,
        is_supplement: true,
        supplements: dup.supplements
          ? dup.supplements + '\n' + (payload.supplements || '')
          : payload.supplements || '',
      };
      const next = get().conclusions.map((c) => (c.id === dup.id ? updated : c));
      saveLS('conclusions', next);
      set({ conclusions: next });
      return { conclusion: updated, merged: true };
    }
    const conclusion: FinalConclusion = {
      id: uid('conc'),
      is_supplement: false,
      supplements: payload.supplements || '',
      ...payload,
    };
    const next = [...get().conclusions, conclusion];
    saveLS('conclusions', next);
    set({ conclusions: next });
    return { conclusion, merged: false };
  },
  jumpTo3D: (noteIdOrConclusionId) => {
    const note = get().riskNotes.find((n) => n.id === noteIdOrConclusionId);
    if (note) {
      return {
        route: '/section',
        partId: note.part_id,
        clip: { x: note.clip_x, y: note.clip_y, z: note.clip_z, enabled: true },
      };
    }
    const conc = get().conclusions.find((c) => c.id === noteIdOrConclusionId);
    const partId = conc ? conc.part_id : noteIdOrConclusionId;
    return {
      route: '/section',
      partId,
      clip: { x: 0, y: 0, z: 0, enabled: false },
    };
  },
}));
