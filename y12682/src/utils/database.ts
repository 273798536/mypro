import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DBShardTopologyDB extends DBSchema {
  topologyData: {
    key: string;
    value: {
      id: string;
      type: 'node' | 'link';
      data: unknown;
      updatedAt: number;
    };
  };
  processRecords: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      data: unknown;
    };
    indexes: { 'by-timestamp': number };
  };
  anomalies: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      data: unknown;
    };
    indexes: { 'by-timestamp': number; 'by-status': string };
  };
  syncRecords: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      data: unknown;
    };
    indexes: { 'by-timestamp': number };
  };
  snapshots: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      type: string;
      data: unknown;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbInstance: IDBPDatabase<DBShardTopologyDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<DBShardTopologyDB>> => {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB<DBShardTopologyDB>('dbShardTopologyDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('topologyData')) {
          db.createObjectStore('topologyData', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('processRecords')) {
          const recordStore = db.createObjectStore('processRecords', { keyPath: 'id' });
          recordStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('anomalies')) {
          const anomalyStore = db.createObjectStore('anomalies', { keyPath: 'id' });
          anomalyStore.createIndex('by-timestamp', 'timestamp');
          anomalyStore.createIndex('by-status', 'data.status');
        }

        if (!db.objectStoreNames.contains('syncRecords')) {
          const syncStore = db.createObjectStore('syncRecords', { keyPath: 'id' });
          syncStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('snapshots')) {
          const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw error;
  }
};

export const saveTopologyData = async (
  id: string,
  type: 'node' | 'link',
  data: unknown
): Promise<void> => {
  const db = await initDB();
  await db.put('topologyData', {
    id,
    type,
    data,
    updatedAt: Date.now(),
  });
};

export const getTopologyData = async (id: string): Promise<unknown | null> => {
  const db = await initDB();
  const result = await db.get('topologyData', id);
  return result?.data || null;
};

export const getAllTopologyData = async (): Promise<unknown[]> => {
  const db = await initDB();
  const results = await db.getAll('topologyData');
  return results.map(r => r.data);
};

export const saveProcessRecord = async (
  id: string,
  data: unknown
): Promise<void> => {
  const db = await initDB();
  await db.put('processRecords', {
    id,
    timestamp: Date.now(),
    data,
  });
};

export const getProcessRecordsByTimeRange = async (
  startTime: number,
  endTime: number
): Promise<unknown[]> => {
  const db = await initDB();
  const records = await db.getAllFromIndex('processRecords', 'by-timestamp');
  return records
    .filter(r => r.timestamp >= startTime && r.timestamp <= endTime)
    .map(r => r.data);
};

export const saveAnomaly = async (
  id: string,
  data: unknown
): Promise<void> => {
  const db = await initDB();
  await db.put('anomalies', {
    id,
    timestamp: Date.now(),
    data,
  });
};

export const getAnomaliesByStatus = async (
  status: string
): Promise<unknown[]> => {
  const db = await initDB();
  const anomalies = await db.getAll('anomalies');
  return anomalies
    .filter(a => (a.data as { status: string }).status === status)
    .map(a => a.data);
};

export const saveSyncRecord = async (
  id: string,
  data: unknown
): Promise<void> => {
  const db = await initDB();
  await db.put('syncRecords', {
    id,
    timestamp: Date.now(),
    data,
  });
};

export const getAllSyncRecords = async (): Promise<unknown[]> => {
  const db = await initDB();
  const records = await db.getAll('syncRecords');
  return records.map(r => r.data);
};

export const createSnapshot = async (
  id: string,
  type: string,
  data: unknown
): Promise<void> => {
  const db = await initDB();
  await db.put('snapshots', {
    id,
    timestamp: Date.now(),
    type,
    data,
  });
};

export const getSnapshotsByTimeRange = async (
  startTime: number,
  endTime: number
): Promise<unknown[]> => {
  const db = await initDB();
  const snapshots = await db.getAllFromIndex('snapshots', 'by-timestamp');
  return snapshots
    .filter(s => s.timestamp >= startTime && s.timestamp <= endTime)
    .map(s => s.data);
};

export const exportAllData = async (): Promise<string> => {
  const db = await initDB();
  
  const topologyData = await db.getAll('topologyData');
  const processRecords = await db.getAll('processRecords');
  const anomalies = await db.getAll('anomalies');
  const syncRecords = await db.getAll('syncRecords');
  const snapshots = await db.getAll('snapshots');

  const exportData = {
    exportTime: Date.now(),
    version: '1.0',
    topologyData: topologyData.map(t => t.data),
    processRecords: processRecords.map(r => r.data),
    anomalies: anomalies.map(a => a.data),
    syncRecords: syncRecords.map(s => s.data),
    snapshots: snapshots.map(s => s.data),
  };

  return JSON.stringify(exportData, null, 2);
};

export const importData = async (jsonString: string): Promise<void> => {
  const db = await initDB();
  const importData = JSON.parse(jsonString);

  if (importData.topologyData) {
    for (const item of importData.topologyData) {
      await db.put('topologyData', {
        id: (item as { id: string }).id,
        type: 'node',
        data: item,
        updatedAt: Date.now(),
      });
    }
  }

  if (importData.processRecords) {
    for (const item of importData.processRecords) {
      await db.put('processRecords', {
        id: (item as { id: string }).id,
        timestamp: (item as { timestamp: number }).timestamp,
        data: item,
      });
    }
  }

  if (importData.anomalies) {
    for (const item of importData.anomalies) {
      await db.put('anomalies', {
        id: (item as { id: string }).id,
        timestamp: (item as { timestamp: number }).timestamp,
        data: item,
      });
    }
  }

  if (importData.syncRecords) {
    for (const item of importData.syncRecords) {
      await db.put('syncRecords', {
        id: (item as { id: string }).id,
        timestamp: (item as { timestamp: number }).timestamp,
        data: item,
      });
    }
  }
};

export const clearAllData = async (): Promise<void> => {
  const db = await initDB();
  await db.clear('topologyData');
  await db.clear('processRecords');
  await db.clear('anomalies');
  await db.clear('syncRecords');
  await db.clear('snapshots');
};
