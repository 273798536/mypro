import type { Snapshot, Sample, Note, Attachment } from '@/types';
import { getDemoCurrentSnapshot, getDemoSnapshotHistory } from './demoData';

export function getMockCurrentSnapshot(): Snapshot {
  return getDemoCurrentSnapshot();
}

export function getMockSnapshotHistory(): Snapshot[] {
  return getDemoSnapshotHistory();
}

export function getMockNotes(): Note[] {
  return getMockCurrentSnapshot().notes;
}

export function getMockAttachments(): Attachment[] {
  return getMockCurrentSnapshot().attachments;
}

export function getMockSamples(): Sample[] {
  return getMockCurrentSnapshot().samples;
}
