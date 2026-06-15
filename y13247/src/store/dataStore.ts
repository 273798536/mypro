import { StageChannelRecord, TrackItem, ArchiveItem, AuthorizationNote, HistoryLogEntry } from '../types';

interface DataStore {
  stageRecords: StageChannelRecord[];
  trackItems: TrackItem[];
  archiveItems: ArchiveItem[];
}

let store: DataStore = {
  stageRecords: [],
  trackItems: [],
  archiveItems: [],
};

export function getStageRecords(): StageChannelRecord[] {
  return [...store.stageRecords];
}

export function getStageRecordById(id: string): StageChannelRecord | undefined {
  return store.stageRecords.find(r => r.id === id);
}

export function getTrackItems(): TrackItem[] {
  return [...store.trackItems];
}

export function getTrackItemById(id: string): TrackItem | undefined {
  return store.trackItems.find(t => t.id === id);
}

export function getArchiveItems(): ArchiveItem[] {
  return store.archiveItems.map(item => ({
    ...item,
    stageRecord: getStageRecordById(item.stageRecordId),
    trackItem: getTrackItemById(item.trackItemId),
  }));
}

export function getArchiveItemById(id: string): ArchiveItem | undefined {
  const item = store.archiveItems.find(a => a.id === id);
  if (!item) return undefined;
  return {
    ...item,
    stageRecord: getStageRecordById(item.stageRecordId),
    trackItem: getTrackItemById(item.trackItemId),
  };
}

export function addStageRecord(record: StageChannelRecord): void {
  store.stageRecords.push(record);
}

export function addTrackItem(item: TrackItem): void {
  store.trackItems.push(item);
}

export function addArchiveItem(item: ArchiveItem): void {
  store.archiveItems.push(item);
}

export function updateArchiveItem(updated: ArchiveItem): void {
  const index = store.archiveItems.findIndex(a => a.id === updated.id);
  if (index !== -1) {
    const { stageRecord, trackItem, ...rest } = updated;
    store.archiveItems[index] = rest;
  }
}

export function addHistoryLog(archiveItemId: string, log: HistoryLogEntry): void {
  const item = store.archiveItems.find(a => a.id === archiveItemId);
  if (item) {
    item.history.push(log);
    item.updatedAt = log.timestamp;
  }
}

export function addAuthorizationNote(note: AuthorizationNote): void {
  const item = store.archiveItems.find(a => a.id === note.archiveItemId);
  if (item) {
    item.authorizationNote = note;
  }
}

export function setStageRecords(records: StageChannelRecord[]): void {
  store.stageRecords = records;
}

export function setTrackItems(items: TrackItem[]): void {
  store.trackItems = items;
}

export function clearAll(): void {
  store = { stageRecords: [], trackItems: [], archiveItems: [] };
}
