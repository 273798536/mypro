import { generateId, now } from '../utils/common';
import type {
  Annotation,
  AppState,
  EarpieceItem,
  ImportResult,
  VersionRecord,
} from '../types';

function snapshotItem(item: EarpieceItem): Partial<EarpieceItem> {
  return JSON.parse(JSON.stringify(item));
}

function makeVersion(
  item: EarpieceItem,
  changeType: VersionRecord['changeType'],
  operator = '运营-小孟',
): VersionRecord {
  return {
    id: generateId('ver'),
    itemId: item.id,
    version: item.version,
    timestamp: now(),
    snapshot: snapshotItem(item),
    changeType,
    operator,
  };
}

export function importItems(state: AppState, result: ImportResult): AppState {
  const newVersions: VersionRecord[] = [];
  const enrichedItems = result.success.map((item) => {
    newVersions.push(makeVersion(item, 'create'));
    return item;
  });
  return {
    ...state,
    items: [...state.items, ...enrichedItems],
    versions: [...state.versions, ...newVersions],
  };
}

export function confirmItem(state: AppState, itemId: string): AppState {
  let newVersion: VersionRecord | null = null;
  const items = state.items.map((item) => {
    if (item.id !== itemId) return item;
    if (item.status === 'confirmed') return item;
    const updated: EarpieceItem = {
      ...item,
      status: 'confirmed',
      confirmedAt: now(),
      updatedAt: now(),
      version: item.version + 1,
    };
    newVersion = makeVersion(updated, 'confirm');
    return updated;
  });
  return {
    ...state,
    items,
    versions: newVersion ? [...state.versions, newVersion] : state.versions,
  };
}

export function withdrawItem(state: AppState, itemId: string): AppState {
  let newVersion: VersionRecord | null = null;
  const items = state.items.map((item) => {
    if (item.id !== itemId) return item;
    const updated: EarpieceItem = {
      ...item,
      status: 'withdrawn',
      withdrawnAt: now(),
      updatedAt: now(),
      version: item.version + 1,
    };
    newVersion = makeVersion(updated, 'withdraw');
    return updated;
  });
  return {
    ...state,
    items,
    versions: newVersion ? [...state.versions, newVersion] : state.versions,
  };
}

export function addAnnotation(
  state: AppState,
  itemId: string,
  content: string,
  author = '运营-小孟',
  isLateNote = false,
): AppState {
  let newVersion: VersionRecord | null = null;
  const annotation: Annotation = {
    id: generateId('ann'),
    createdAt: now(),
    content,
    author,
    isLateNote,
  };
  const items = state.items.map((item) => {
    if (item.id !== itemId) return item;
    const updated: EarpieceItem = {
      ...item,
      annotations: [...item.annotations, annotation],
      updatedAt: now(),
      version: item.version + 1,
    };
    newVersion = makeVersion(updated, 'annotate');
    return updated;
  });
  return {
    ...state,
    items,
    versions: newVersion ? [...state.versions, newVersion] : state.versions,
  };
}

export function updateItemField(
  state: AppState,
  itemId: string,
  field: keyof EarpieceItem,
  value: unknown,
): AppState {
  let newVersion: VersionRecord | null = null;
  const items = state.items.map((item) => {
    if (item.id !== itemId) return item;
    const updated: EarpieceItem = {
      ...item,
      [field]: value,
      updatedAt: now(),
      version: item.version + 1,
    } as EarpieceItem;
    newVersion = makeVersion(updated, 'update');
    return updated;
  });
  return {
    ...state,
    items,
    versions: newVersion ? [...state.versions, newVersion] : state.versions,
  };
}

export function deleteItem(state: AppState, itemId: string): AppState {
  return {
    ...state,
    items: state.items.filter((i) => i.id !== itemId),
    selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
  };
}

export function selectItem(state: AppState, itemId: string | null): AppState {
  return { ...state, selectedItemId: itemId };
}

export function getItemVersions(state: AppState, itemId: string): VersionRecord[] {
  return state.versions
    .filter((v) => v.itemId === itemId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function resetState(): AppState {
  return { items: [], versions: [], selectedItemId: null };
}
