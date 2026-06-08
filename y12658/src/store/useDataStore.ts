import { create } from 'zustand';
import type { CoordinateRecord, ImportResult, ColorRange } from '@/types';
import { generateMockEddyRecords } from '@/data/mockEddyData';
import { computeHash, uid, batchId } from '@/utils/hash';
import { detectCoordinateSystem, isOutOfBounds, hasCoordinateMix } from '@/utils/coordinate';
import { valueRange } from '@/utils/colorScale';

interface DataState {
  records: CoordinateRecord[];
  selectedRecordId: string | null;
  hoveredRecordId: string | null;
  valueRange: ColorRange;
  importResults: ImportResult[];
  selectedBatchId: string | null;
  setSelectedRecord: (id: string | null) => void;
  setHoveredRecord: (id: string | null) => void;
  loadMockData: () => void;
  importRecords: (rawRows: Array<Record<string, unknown>>, fileName: string) => ImportResult;
  resolveAbnormal: (recordId: string, type: string) => void;
  setConclusion: (recordId: string, conclusion: string) => void;
  clearAll: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  records: [],
  selectedRecordId: null,
  hoveredRecordId: null,
  valueRange: { min: 0, max: 1 },
  importResults: [],
  selectedBatchId: null,

  setSelectedRecord: (id) => set({ selectedRecordId: id }),
  setHoveredRecord: (id) => set({ hoveredRecordId: id }),

  loadMockData: () => {
    const records = generateMockEddyRecords();
    const range = valueRange(records.map((r) => r.value));
    set({ records, valueRange: range });
  },

  importRecords: (rawRows, fileName) => {
    const { records: existing } = get();
    const existingHashes = new Set(existing.map((r) => r.hash));
    const bid = batchId();
    const inserted: CoordinateRecord[] = [];
    let duplicates = 0;
    let mixed = 0;
    let outOfBounds = 0;
    const systemsInBatch: string[] = [];

    rawRows.forEach((row, idx) => {
      const deviceId = String(row.deviceId ?? row.device_id ?? row.id ?? `DEV-${idx}`);
      const x = Number(row.x ?? row.lon ?? row.X ?? 0);
      const y = Number(row.y ?? row.lat ?? row.Y ?? 0);
      const z = Number(row.z ?? row.depth ?? row.Z ?? 0);
      const value = Number(row.value ?? row.v ?? row.velocity ?? 0);
      const timestamp = String(row.timestamp ?? row.time ?? row.ts ?? new Date().toISOString());
      const hash = computeHash(deviceId, x, y, z, timestamp);

      if (existingHashes.has(hash)) {
        duplicates++;
        return;
      }
      existingHashes.add(hash);

      const sys = detectCoordinateSystem(x, y, z);
      systemsInBatch.push(sys);

      const flags: CoordinateRecord['abnormalFlags'] = [];
      if (isOutOfBounds(x, y, z)) {
        outOfBounds++;
        flags.push({ type: 'OUT_OF_BOUNDS', detail: `坐标超出范围 (x:${x}, y:${y}, z:${z})`, resolved: false });
      }

      inserted.push({
        id: uid(),
        deviceId,
        x,
        y,
        z,
        value,
        coordinateSystem: sys,
        timestamp,
        hash,
        sourceMeta: {
          sourceFileName: fileName,
          originalLineNumber: idx + 2,
          importBatchId: bid,
          remark: String(row.remark ?? ''),
        },
        abnormalFlags: flags,
      });
    });

    if (hasCoordinateMix(systemsInBatch as never)) {
      mixed = systemsInBatch.filter((s) => s !== systemsInBatch[0] && s !== 'UNKNOWN').length;
      inserted.forEach((r) => {
        if (r.coordinateSystem !== (systemsInBatch[0] as never)) {
          r.abnormalFlags.push({
            type: 'COORDINATE_MIX',
            detail: `与批次主坐标系不一致 (${r.coordinateSystem})`,
            resolved: false,
          });
        }
      });
    }

    const all = [...existing, ...inserted];
    const range = valueRange(all.map((r) => r.value));
    const result: ImportResult = {
      total: rawRows.length,
      inserted: inserted.length,
      duplicates,
      mixed,
      outOfBounds,
      batchId: bid,
    };
    set({
      records: all,
      valueRange: range,
      importResults: [...get().importResults, result],
      selectedBatchId: bid,
    });
    return result;
  },

  resolveAbnormal: (recordId, type) => {
    set((s) => ({
      records: s.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              abnormalFlags: r.abnormalFlags.map((f) => (f.type === type ? { ...f, resolved: true } : f)),
            }
          : r
      ),
    }));
  },

  setConclusion: (recordId, conclusion) => {
    set((s) => ({
      records: s.records.map((r) => (r.id === recordId ? { ...r, conclusion } : r)),
    }));
  },

  clearAll: () => set({ records: [], selectedRecordId: null, hoveredRecordId: null, valueRange: { min: 0, max: 1 } }),
}));
