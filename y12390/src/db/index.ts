import Dexie from 'dexie';
import type {
  Preset,
  PresetVersion,
  Snapshot,
  Assignment,
  Anomaly,
  AudioFile,
  Sandbox,
  SandboxRun,
} from './schema';
import { mockPresets, mockPresetVersions } from '../data/mockPresets';
import { mockSnapshots } from '../data/mockSnapshots';
import { mockAssignments } from '../data/mockAssignments';
import { mockAnomalies } from '../data/mockAnomalies';

export class PresetVaultDB extends Dexie {
  presets!: Dexie.Table<Preset, string>;
  presetVersions!: Dexie.Table<PresetVersion, string>;
  snapshots!: Dexie.Table<Snapshot, string>;
  assignments!: Dexie.Table<Assignment, string>;
  anomalies!: Dexie.Table<Anomaly, string>;
  audioFiles!: Dexie.Table<AudioFile, string>;
  sandboxes!: Dexie.Table<Sandbox, string>;
  sandboxRuns!: Dexie.Table<SandboxRun, string>;

  constructor() {
    super('PresetVaultDB');

    this.version(1).stores({
      presets: 'id, createdAt, updatedAt',
      presetVersions: 'id, presetId, createdAt, fileHash',
      snapshots: 'id, presetVersionId, createdAt, assignmentId',
      assignments: 'id, snapshotId, presetVersionId, studentId, status, createdAt',
      anomalies: 'id, entityType, entityId, type, severity, status, detectedAt',
      audioFiles: 'id, assignmentId, fileHash, uploadedAt',
      sandboxes: 'id, createdAt',
      sandboxRuns: 'id, sandboxId, runNumber',
    });
  }
}

export const db = new PresetVaultDB();

export async function initializeDB(): Promise<void> {
  try {
    const presetsCount = await db.presets.count();
    if (presetsCount === 0) {
      console.log('Initializing DB with mock data...');
      for (const p of mockPresets) {
        await db.presets.add(p as any).catch(e => console.error('preset add error:', e));
      }
      for (const v of mockPresetVersions) {
        await db.presetVersions.add(v as any).catch(e => console.error('version add error:', e));
      }
      for (const s of mockSnapshots) {
        await db.snapshots.add(s as any).catch(e => console.error('snapshot add error:', e));
      }
      for (const a of mockAssignments) {
        await db.assignments.add(a as any).catch(e => console.error('assignment add error:', e));
      }
      for (const a of mockAnomalies) {
        await db.anomalies.add(a as any).catch(e => console.error('anomaly add error:', e));
      }
      console.log('DB initialized successfully');
    } else {
      console.log('DB already has data, skipping init');
    }
  } catch (e) {
    console.error('DB init error:', e);
  }
}

export async function resetDB(): Promise<void> {
  await db.delete();
  await initializeDB();
}

export default db;
