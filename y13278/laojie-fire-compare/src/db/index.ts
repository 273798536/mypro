import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import type {
  FirePlan,
  SceneAnnotation,
  ResidentFeedback,
  SitePhoto,
  ChangeRecord,
  VersionSnapshot,
} from '../types';

const DB_NAME = 'laojie-fire-compare-db';
const DB_VERSION = 1;

export interface DBSchema {
  plans: {
    key: string;
    value: FirePlan;
    indexes: { 'by-updatedAt': number };
  };
  annotations: {
    key: string;
    value: SceneAnnotation;
    indexes: { 'by-planId': string; 'by-updatedAt': number };
  };
  feedbacks: {
    key: string;
    value: ResidentFeedback;
    indexes: { 'by-planId': string; 'by-createdAt': number };
  };
  photos: {
    key: string;
    value: SitePhoto;
    indexes: { 'by-planId': string; 'by-uploadedAt': number };
  };
  changes: {
    key: string;
    value: ChangeRecord;
    indexes: { 'by-planId': string; 'by-timestamp': number };
  };
  snapshots: {
    key: string;
    value: VersionSnapshot;
    indexes: { 'by-planId-version': [string, number]; 'by-createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('plans')) {
          const planStore = db.createObjectStore('plans', { keyPath: 'id' });
          planStore.createIndex('by-updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const annStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annStore.createIndex('by-planId', 'planId');
          annStore.createIndex('by-updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('feedbacks')) {
          const fbStore = db.createObjectStore('feedbacks', { keyPath: 'id' });
          fbStore.createIndex('by-planId', 'planId');
          fbStore.createIndex('by-createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains('photos')) {
          const phStore = db.createObjectStore('photos', { keyPath: 'id' });
          phStore.createIndex('by-planId', 'planId');
          phStore.createIndex('by-uploadedAt', 'uploadedAt');
        }
        if (!db.objectStoreNames.contains('changes')) {
          const chStore = db.createObjectStore('changes', { keyPath: 'id' });
          chStore.createIndex('by-planId', 'planId');
          chStore.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const snStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snStore.createIndex('by-planId-version', ['planId', 'version']);
          snStore.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}
