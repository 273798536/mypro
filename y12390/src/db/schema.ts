import type {
  Preset,
  PresetVersion,
  Snapshot,
  Assignment,
  Anomaly,
  AudioFile,
  Sandbox,
  SandboxRun,
} from '../types';

export type { Preset, PresetVersion, Snapshot, Assignment, Anomaly, AudioFile, Sandbox, SandboxRun };

export interface PresetVaultDBSchema {
  presets: Preset;
  presetVersions: PresetVersion;
  snapshots: Snapshot;
  assignments: Assignment;
  anomalies: Anomaly;
  audioFiles: AudioFile;
  sandboxes: Sandbox;
  sandboxRuns: SandboxRun;
}
