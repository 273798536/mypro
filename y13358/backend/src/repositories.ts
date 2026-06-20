import db from './db';

export interface Run {
  id: number;
  run_id: string;
  name: string;
  params_json: string;
  engineer: string;
  created_at: string;
  description: string | null;
  parent_run_id: string | null;
}

export interface FeatureSnapshot {
  id: number;
  snapshot_id: string;
  name: string;
  feature_definition: string;
  version: string;
  offline_metric_json: string | null;
  online_metric_json: string | null;
  metric_mismatch_reason: string | null;
  created_at: string;
  created_by: string;
  is_temporary: number;
  original_snapshot_id: string | null;
}

export interface Sample {
  id: number;
  sample_id: string;
  content: string;
  ground_truth_label: string;
  is_replay: number;
  original_run_id: string | null;
  original_model_label: string | null;
  note: string | null;
}

export interface Judgment {
  id: number;
  run_id: string;
  sample_id: string;
  model_label: string;
  confidence: number;
  final_decision: string;
  decision_reason: string | null;
  judged_at: string;
  judged_by: string;
  is_modified: number;
  feature_snapshot_ids_json: string | null;
}

export interface JudgmentHistory {
  id: number;
  run_id: string;
  sample_id: string;
  previous_decision: string;
  new_decision: string;
  previous_reason: string | null;
  new_reason: string | null;
  changed_by: string;
  changed_at: string;
  change_note: string | null;
}

export interface SnapshotNote {
  id: number;
  snapshot_id: string;
  note_content: string;
  created_at: string;
  created_by: string;
  changed_judgments_json: string | null;
}

export interface RunSnapshotLink {
  id: number;
  run_id: string;
  snapshot_id: string;
  added_at: string;
  added_by: string;
  remark: string | null;
}

export class RunRepository {
  static list(limit = 50): Run[] {
    return db.prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT ?').all(limit) as Run[];
  }

  static get(runId: string): Run | undefined {
    return db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId) as Run | undefined;
  }

  static checkDuplicate(runId: string): { exists: boolean; originalRun?: Run } {
    const existing = db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId) as Run | undefined;
    if (existing) {
      return { exists: true, originalRun: existing };
    }
    return { exists: false };
  }

  static create(data: Omit<Run, 'id' | 'created_at'>): Run {
    const info = db.prepare(`
      INSERT INTO runs (run_id, name, params_json, engineer, description, parent_run_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.run_id, data.name, data.params_json, data.engineer, data.description ?? null, data.parent_run_id ?? null);
    return this.get(data.run_id)!;
  }
}

export class FeatureSnapshotRepository {
  static list(limit = 100): FeatureSnapshot[] {
    return db.prepare('SELECT * FROM feature_snapshots ORDER BY created_at DESC LIMIT ?').all(limit) as FeatureSnapshot[];
  }

  static get(snapshotId: string): FeatureSnapshot | undefined {
    return db.prepare('SELECT * FROM feature_snapshots WHERE snapshot_id = ?').get(snapshotId) as FeatureSnapshot | undefined;
  }

  static getByRun(runId: string): (FeatureSnapshot & RunSnapshotLink)[] {
    return db.prepare(`
      SELECT fs.*, rsl.added_at, rsl.added_by, rsl.remark
      FROM feature_snapshots fs
      JOIN run_snapshot_links rsl ON fs.snapshot_id = rsl.snapshot_id
      WHERE rsl.run_id = ?
      ORDER BY rsl.added_at ASC
    `).all(runId) as (FeatureSnapshot & RunSnapshotLink)[];
  }

  static create(data: Omit<FeatureSnapshot, 'id' | 'created_at'>): FeatureSnapshot {
    const info = db.prepare(`
      INSERT INTO feature_snapshots
      (snapshot_id, name, feature_definition, version, offline_metric_json, online_metric_json,
       metric_mismatch_reason, created_by, is_temporary, original_snapshot_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.snapshot_id, data.name, data.feature_definition, data.version,
      data.offline_metric_json ?? null, data.online_metric_json ?? null,
      data.metric_mismatch_reason ?? null, data.created_by, data.is_temporary,
      data.original_snapshot_id ?? null
    );
    return this.get(data.snapshot_id)!;
  }

  static addNote(note: Omit<SnapshotNote, 'id' | 'created_at'>): SnapshotNote {
    const info = db.prepare(`
      INSERT INTO snapshot_notes (snapshot_id, note_content, created_by, changed_judgments_json)
      VALUES (?, ?, ?, ?)
    `).run(note.snapshot_id, note.note_content, note.created_by, note.changed_judgments_json ?? null);
    return db.prepare('SELECT * FROM snapshot_notes WHERE id = ?').get(info.lastInsertRowid) as SnapshotNote;
  }

  static getNotes(snapshotId: string): SnapshotNote[] {
    return db.prepare('SELECT * FROM snapshot_notes WHERE snapshot_id = ? ORDER BY created_at DESC').all(snapshotId) as SnapshotNote[];
  }
}

export class RunSnapshotLinkRepository {
  static link(runId: string, snapshotId: string, addedBy: string, remark?: string): void {
    db.prepare(`
      INSERT OR IGNORE INTO run_snapshot_links (run_id, snapshot_id, added_by, remark)
      VALUES (?, ?, ?, ?)
    `).run(runId, snapshotId, addedBy, remark ?? null);
  }
}

export class SampleRepository {
  static list(limit = 200): Sample[] {
    return db.prepare('SELECT * FROM samples ORDER BY id DESC LIMIT ?').all(limit) as Sample[];
  }

  static get(sampleId: string): Sample | undefined {
    return db.prepare('SELECT * FROM samples WHERE sample_id = ?').get(sampleId) as Sample | undefined;
  }

  static listReplaySamples(): Sample[] {
    return db.prepare('SELECT * FROM samples WHERE is_replay = 1 ORDER BY id DESC').all() as Sample[];
  }

  static create(data: Omit<Sample, 'id'>): Sample {
    const info = db.prepare(`
      INSERT INTO samples (sample_id, content, ground_truth_label, is_replay, original_run_id, original_model_label, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.sample_id, data.content, data.ground_truth_label, data.is_replay,
      data.original_run_id ?? null, data.original_model_label ?? null, data.note ?? null
    );
    return this.get(data.sample_id)!;
  }
}

export class JudgmentRepository {
  static getByRun(runId: string): (Judgment & { sample_content?: string; ground_truth_label?: string })[] {
    return db.prepare(`
      SELECT j.*, s.content AS sample_content, s.ground_truth_label
      FROM judgments j
      JOIN samples s ON j.sample_id = s.sample_id
      WHERE j.run_id = ?
      ORDER BY j.judged_at DESC
    `).all(runId) as (Judgment & { sample_content?: string; ground_truth_label?: string })[];
  }

  static get(runId: string, sampleId: string): Judgment | undefined {
    return db.prepare('SELECT * FROM judgments WHERE run_id = ? AND sample_id = ?').get(runId, sampleId) as Judgment | undefined;
  }

  static create(data: Omit<Judgment, 'id' | 'judged_at'>): Judgment {
    const info = db.prepare(`
      INSERT INTO judgments
      (run_id, sample_id, model_label, confidence, final_decision, decision_reason,
       judged_by, is_modified, feature_snapshot_ids_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.run_id, data.sample_id, data.model_label, data.confidence,
      data.final_decision, data.decision_reason ?? null, data.judged_by,
      data.is_modified, data.feature_snapshot_ids_json ?? null
    );
    return this.get(data.run_id, data.sample_id)!;
  }

  static updateDecision(
    runId: string,
    sampleId: string,
    newDecision: string,
    newReason: string,
    changedBy: string,
    changeNote?: string
  ): Judgment {
    const existing = this.get(runId, sampleId);
    if (!existing) throw new Error('Judgment not found');

    db.prepare(`
      INSERT INTO judgment_history
      (run_id, sample_id, previous_decision, new_decision, previous_reason, new_reason, changed_by, change_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId, sampleId, existing.final_decision, newDecision,
      existing.decision_reason, newReason, changedBy, changeNote ?? null
    );

    db.prepare(`
      UPDATE judgments
      SET final_decision = ?, decision_reason = ?, is_modified = 1, judged_by = ?
      WHERE run_id = ? AND sample_id = ?
    `).run(newDecision, newReason, changedBy, runId, sampleId);

    return this.get(runId, sampleId)!;
  }

  static getHistory(runId: string, sampleId: string): JudgmentHistory[] {
    return db.prepare(`
      SELECT * FROM judgment_history
      WHERE run_id = ? AND sample_id = ?
      ORDER BY changed_at DESC
    `).all(runId, sampleId) as JudgmentHistory[];
  }
}

export class ComparisonRepository {
  static compareRuns(baseRunId: string, compareRunId: string) {
    const baseJudgments = JudgmentRepository.getByRun(baseRunId);
    const compareJudgments = JudgmentRepository.getByRun(compareRunId);

    const baseMap = new Map(baseJudgments.map(j => [j.sample_id, j]));
    const compareMap = new Map(compareJudgments.map(j => [j.sample_id, j]));

    const allSampleIds = new Set([...baseMap.keys(), ...compareMap.keys()]);

    const changed: any[] = [];
    const added: any[] = [];
    const removed: any[] = [];
    const unchanged: any[] = [];

    allSampleIds.forEach(sid => {
      const b = baseMap.get(sid);
      const c = compareMap.get(sid);
      if (b && c) {
        if (b.final_decision !== c.final_decision) {
          changed.push({ sample_id: sid, base: b, compare: c });
        } else {
          unchanged.push({ sample_id: sid, base: b, compare: c });
        }
      } else if (c && !b) {
        added.push({ sample_id: sid, compare: c });
      } else if (b && !c) {
        removed.push({ sample_id: sid, base: b });
      }
    });

    const baseSnapshots = FeatureSnapshotRepository.getByRun(baseRunId);
    const compareSnapshots = FeatureSnapshotRepository.getByRun(compareRunId);
    const baseSnapshotIds = new Set(baseSnapshots.map(s => s.snapshot_id));
    const compareSnapshotIds = new Set(compareSnapshots.map(s => s.snapshot_id));

    const snapshotDiff = {
      added: compareSnapshots.filter(s => !baseSnapshotIds.has(s.snapshot_id)),
      removed: baseSnapshots.filter(s => !compareSnapshotIds.has(s.snapshot_id)),
      common: compareSnapshots.filter(s => baseSnapshotIds.has(s.snapshot_id))
    };

    return {
      base_run_id: baseRunId,
      compare_run_id: compareRunId,
      summary: {
        total: allSampleIds.size,
        changed: changed.length,
        added: added.length,
        removed: removed.length,
        unchanged: unchanged.length
      },
      changed_samples: changed,
      added_samples: added,
      removed_samples: removed,
      unchanged_samples: unchanged,
      snapshot_diff: snapshotDiff
    };
  }
}
