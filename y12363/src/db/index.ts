import localforage from 'localforage';
import {
  MaterialBatch,
  RadiationReading,
  EstimationResult,
  AnomalyRecord,
  AuditTrail,
  SystemConfig,
  EstimationRun,
} from '../types';

localforage.config({
  name: 'ThermalRadiationDB',
  version: 1.0,
  storeName: 'thermalRadiationStore',
  description: '热辐射炉温估算系统数据库',
});

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getStore = <T>(key: string) => localforage.createInstance({ name: key }) as LocalForageTyped<T>;

interface LocalForageTyped<T> {
  iterate(callback: (value: T, key: string, iterationNumber: number) => void): Promise<void>;
  getItem(key: string): Promise<T | null>;
  setItem(key: string, value: T): Promise<T>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

const stores = {
  batches: getStore<MaterialBatch>('batches'),
  readings: getStore<RadiationReading>('readings'),
  results: getStore<EstimationResult>('results'),
  anomalies: getStore<AnomalyRecord>('anomalies'),
  audit: getStore<AuditTrail>('audit'),
  config: getStore<SystemConfig>('config'),
  runs: getStore<EstimationRun>('runs'),
};

export const db = {
  batches: {
    async getAll(): Promise<MaterialBatch[]> {
      const items: MaterialBatch[] = [];
      await stores.batches.iterate((value) => {
        items.push(value);
      });
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async getById(id: string): Promise<MaterialBatch | null> {
      return stores.batches.getItem(id);
    },

    async create(data: Omit<MaterialBatch, 'id' | 'createdAt' | 'updatedAt'>): Promise<MaterialBatch> {
      const now = new Date();
      const item: MaterialBatch = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await stores.batches.setItem(item.id, item);
      return item;
    },

    async update(id: string, data: Partial<MaterialBatch>): Promise<MaterialBatch | null> {
      const existing = await stores.batches.getItem(id);
      if (!existing) return null;
      const updated: MaterialBatch = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      await stores.batches.setItem(id, updated);
      return updated;
    },

    async delete(id: string): Promise<void> {
      await stores.batches.removeItem(id);
    },

    async clear(): Promise<void> {
      await stores.batches.clear();
    },
  },

  readings: {
    async getAll(): Promise<RadiationReading[]> {
      const items: RadiationReading[] = [];
      await stores.readings.iterate((value) => {
        items.push(value);
      });
      return items.sort((a, b) => new Date(b.readingTime).getTime() - new Date(a.readingTime).getTime());
    },

    async getById(id: string): Promise<RadiationReading | null> {
      return stores.readings.getItem(id);
    },

    async create(data: Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>): Promise<RadiationReading> {
      const now = new Date();
      const item: RadiationReading = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await stores.readings.setItem(item.id, item);
      return item;
    },

    async update(id: string, data: Partial<RadiationReading>): Promise<RadiationReading | null> {
      const existing = await stores.readings.getItem(id);
      if (!existing) return null;
      const updated: RadiationReading = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      await stores.readings.setItem(id, updated);
      return updated;
    },

    async bulkCreate(data: Array<Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>>): Promise<RadiationReading[]> {
      const now = new Date();
      const items: RadiationReading[] = data.map((d) => ({
        ...d,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }));
      for (const item of items) {
        await stores.readings.setItem(item.id, item);
      }
      return items;
    },

    async delete(id: string): Promise<void> {
      await stores.readings.removeItem(id);
    },

    async clear(): Promise<void> {
      await stores.readings.clear();
    },
  },

  results: {
    async getAll(): Promise<EstimationResult[]> {
      const items: EstimationResult[] = [];
      await stores.results.iterate((value) => {
        items.push(value);
      });
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    async getByRunId(runId: string): Promise<EstimationResult[]> {
      const items: EstimationResult[] = [];
      await stores.results.iterate((value) => {
        if (value.runId === runId) {
          items.push(value);
        }
      });
      return items;
    },

    async getById(id: string): Promise<EstimationResult | null> {
      return stores.results.getItem(id);
    },

    async create(data: Omit<EstimationResult, 'id' | 'createdAt'>): Promise<EstimationResult> {
      const item: EstimationResult = {
        ...data,
        id: generateId(),
        createdAt: new Date(),
      };
      await stores.results.setItem(item.id, item);
      return item;
    },

    async bulkCreate(data: Array<Omit<EstimationResult, 'id' | 'createdAt'>>): Promise<EstimationResult[]> {
      const now = new Date();
      const items: EstimationResult[] = data.map((d) => ({
        ...d,
        id: generateId(),
        createdAt: now,
      }));
      for (const item of items) {
        await stores.results.setItem(item.id, item);
      }
      return items;
    },

    async update(id: string, data: Partial<EstimationResult>): Promise<EstimationResult | null> {
      const existing = await stores.results.getItem(id);
      if (!existing) return null;
      const updated: EstimationResult = {
        ...existing,
        ...data,
      };
      await stores.results.setItem(id, updated);
      return updated;
    },

    async clear(): Promise<void> {
      await stores.results.clear();
    },
  },

  anomalies: {
    async getAll(): Promise<AnomalyRecord[]> {
      const items: AnomalyRecord[] = [];
      await stores.anomalies.iterate((value) => {
        items.push(value);
      });
      return items.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    },

    async getByResultId(resultId: string): Promise<AnomalyRecord | null> {
      let found: AnomalyRecord | null = null;
      await stores.anomalies.iterate((value) => {
        if (value.resultId === resultId) {
          found = value;
        }
      });
      return found;
    },

    async create(data: Omit<AnomalyRecord, 'id' | 'detectedAt' | 'isReviewed' | 'reviewedBy' | 'reviewedAt' | 'reviewRemark'>): Promise<AnomalyRecord> {
      const item: AnomalyRecord = {
        ...data,
        id: generateId(),
        detectedAt: new Date(),
        isReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
        reviewRemark: null,
      };
      await stores.anomalies.setItem(item.id, item);
      return item;
    },

    async bulkCreate(data: Array<Omit<AnomalyRecord, 'id' | 'detectedAt' | 'isReviewed' | 'reviewedBy' | 'reviewedAt' | 'reviewRemark'>>): Promise<AnomalyRecord[]> {
      const now = new Date();
      const items: AnomalyRecord[] = data.map((d) => ({
        ...d,
        id: generateId(),
        detectedAt: now,
        isReviewed: false,
        reviewedBy: null,
        reviewedAt: null,
        reviewRemark: null,
      }));
      for (const item of items) {
        await stores.anomalies.setItem(item.id, item);
      }
      return items;
    },

    async review(id: string, reviewedBy: string, reviewRemark: string): Promise<AnomalyRecord | null> {
      const existing = await stores.anomalies.getItem(id);
      if (!existing) return null;
      const updated: AnomalyRecord = {
        ...existing,
        isReviewed: true,
        reviewedBy,
        reviewedAt: new Date(),
        reviewRemark,
      };
      await stores.anomalies.setItem(id, updated);
      return updated;
    },

    async clear(): Promise<void> {
      await stores.anomalies.clear();
    },
  },

  audit: {
    async getAll(): Promise<AuditTrail[]> {
      const items: AuditTrail[] = [];
      await stores.audit.iterate((value) => {
        items.push(value);
      });
      return items.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    },

    async getByEntity(entityType: AuditTrail['entityType'], entityId: string): Promise<AuditTrail[]> {
      const items: AuditTrail[] = [];
      await stores.audit.iterate((value) => {
        if (value.entityType === entityType && value.entityId === entityId) {
          items.push(value);
        }
      });
      return items.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    },

    async create(data: Omit<AuditTrail, 'id' | 'modifiedAt'>): Promise<AuditTrail> {
      const item: AuditTrail = {
        ...data,
        id: generateId(),
        modifiedAt: new Date(),
      };
      await stores.audit.setItem(item.id, item);
      return item;
    },

    async clear(): Promise<void> {
      await stores.audit.clear();
    },
  },

  config: {
    async getAll(): Promise<SystemConfig[]> {
      const items: SystemConfig[] = [];
      await stores.config.iterate((value) => {
        items.push(value);
      });
      return items;
    },

    async getByKey(configKey: string): Promise<SystemConfig | null> {
      let found: SystemConfig | null = null;
      await stores.config.iterate((value) => {
        if (value.configKey === configKey) {
          found = value;
        }
      });
      return found;
    },

    async create(data: Omit<SystemConfig, 'id' | 'isModified' | 'modifiedAt' | 'modifiedBy'>): Promise<SystemConfig> {
      const item: SystemConfig = {
        ...data,
        id: generateId(),
        isModified: false,
        modifiedAt: null,
        modifiedBy: null,
      };
      await stores.config.setItem(item.id, item);
      return item;
    },

    async update(id: string, configValue: number | string | boolean, modifiedBy: string): Promise<SystemConfig | null> {
      const existing = await stores.config.getItem(id);
      if (!existing) return null;
      const updated: SystemConfig = {
        ...existing,
        configValue,
        isModified: true,
        modifiedAt: new Date(),
        modifiedBy,
      };
      await stores.config.setItem(id, updated);
      return updated;
    },

    async bulkCreate(data: Array<Omit<SystemConfig, 'id' | 'isModified' | 'modifiedAt' | 'modifiedBy'>>): Promise<SystemConfig[]> {
      const items: SystemConfig[] = data.map((d) => ({
        ...d,
        id: generateId(),
        isModified: false,
        modifiedAt: null,
        modifiedBy: null,
      }));
      for (const item of items) {
        await stores.config.setItem(item.id, item);
      }
      return items;
    },

    async clear(): Promise<void> {
      await stores.config.clear();
    },
  },

  runs: {
    async getAll(): Promise<EstimationRun[]> {
      const items: EstimationRun[] = [];
      await stores.runs.iterate((value) => {
        items.push(value);
      });
      return items.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    },

    async getById(id: string): Promise<EstimationRun | null> {
      return stores.runs.getItem(id);
    },

    async create(data: Omit<EstimationRun, 'id'>): Promise<EstimationRun> {
      const item: EstimationRun = {
        ...data,
        id: generateId(),
      };
      await stores.runs.setItem(item.id, item);
      return item;
    },

    async update(id: string, data: Partial<EstimationRun>): Promise<EstimationRun | null> {
      const existing = await stores.runs.getItem(id);
      if (!existing) return null;
      const updated: EstimationRun = {
        ...existing,
        ...data,
      };
      await stores.runs.setItem(id, updated);
      return updated;
    },

    async clear(): Promise<void> {
      await stores.runs.clear();
    },
  },

  generateId,
};
