import type { SensorRecord } from '../../shared/types.js';
import { readJSON, writeJSON } from '../storage/FileStorage.js';
import { generateSeed } from './SeedService.js';

const FILE = 'sensor_records.json';
const EMPTY: { version: number; records: SensorRecord[] } = { version: 1, records: [] };

function read() {
  return readJSON<{ version: number; records: SensorRecord[] }>(FILE, EMPTY);
}

function write(data: { version: number; records: SensorRecord[] }) {
  writeJSON(FILE, data);
}

export const RecordService = {
  getAll(): SensorRecord[] {
    const data = read();
    return data.records;
  },

  getById(id: string): SensorRecord | undefined {
    return read().records.find(r => r.id === id);
  },

  getByPointId(pointId: string): SensorRecord[] {
    return read().records.filter(r => r.point_id === pointId);
  },

  replaceAll(records: SensorRecord[]) {
    write({ version: 1, records });
  },

  seedIfEmpty(): { records: SensorRecord[]; seeded: boolean } {
    const cur = read();
    if (cur.records.length > 0) {
      return { records: cur.records, seeded: false };
    }
    const { records } = generateSeed();
    write({ version: 1, records });
    return { records, seeded: true };
  },
};
