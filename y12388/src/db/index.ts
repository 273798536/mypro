import { openDB, IDBPDatabase, IDBPTransaction, StoreKey } from 'idb'
import type {
  Registration,
  Material,
  Repertoire,
  Payment,
  Document,
  TeacherNote,
  HistoryRecord,
  Snapshot,
  StoreName,
  StoreConfig,
} from '@/types'

interface DBConfig {
  name: string
  version: number
  stores: Record<StoreName, StoreConfig>
}

export const DB_CONFIG: DBConfig = {
  name: 'ExamRegistrationDB',
  version: 1,
  stores: {
    registrations: { keyPath: 'id', indexes: ['status', 'examLevel', 'createdAt'] },
    materials: { keyPath: 'id', indexes: ['registrationId', 'type'] },
    repertoires: { keyPath: 'id', indexes: ['registrationId', 'source'] },
    payments: { keyPath: 'id', indexes: ['registrationId', 'status'] },
    documents: { keyPath: 'id', indexes: ['registrationId', 'type', 'status'] },
    teacherNotes: { keyPath: 'id', indexes: ['registrationId', 'createdAt'] },
    historyRecords: { keyPath: 'id', indexes: ['registrationId', 'createdAt'] },
    snapshots: { keyPath: 'id', indexes: ['registrationId', 'version'] },
  },
}

interface AppDB {
  registrations: {
    key: string
    value: Registration
    indexes: {
      status: string
      examLevel: string
      createdAt: string
    }
  }
  materials: {
    key: string
    value: Material
    indexes: {
      registrationId: string
      type: string
    }
  }
  repertoires: {
    key: string
    value: Repertoire
    indexes: {
      registrationId: string
      source: string
    }
  }
  payments: {
    key: string
    value: Payment
    indexes: {
      registrationId: string
      status: string
    }
  }
  documents: {
    key: string
    value: Document
    indexes: {
      registrationId: string
      type: string
      status: string
    }
  }
  teacherNotes: {
    key: string
    value: TeacherNote
    indexes: {
      registrationId: string
      createdAt: string
    }
  }
  historyRecords: {
    key: string
    value: HistoryRecord
    indexes: {
      registrationId: string
      createdAt: string
    }
  }
  snapshots: {
    key: string
    value: Snapshot
    indexes: {
      registrationId: string
      version: number
    }
  }
}

let dbInstance: IDBPDatabase<AppDB> | null = null

export async function initDB(): Promise<IDBPDatabase<AppDB>> {
  if (dbInstance) {
    return dbInstance
  }

  const db = await openDB<AppDB>(DB_CONFIG.name, DB_CONFIG.version, {
    upgrade(database: IDBPDatabase<AppDB>, oldVersion: number, _newVersion: number, transaction: IDBPTransaction<AppDB, StoreName[], 'versionchange'>) {
      Object.entries(DB_CONFIG.stores).forEach(([storeName, config]) => {
        const storeKey = storeName as StoreName
        if (!database.objectStoreNames.contains(storeKey)) {
          const store = database.createObjectStore(storeKey, {
            keyPath: config.keyPath,
          })
          config.indexes.forEach((indexName) => {
            store.createIndex(indexName, indexName, { unique: false })
          })
        } else if (oldVersion < DB_CONFIG.version) {
          const store = transaction.objectStore(storeKey)
          const existingIndexes = store.indexNames
          config.indexes.forEach((indexName) => {
            if (!existingIndexes.contains(indexName)) {
              store.createIndex(indexName, indexName, { unique: false })
            }
          })
        }
      })
    },
  })

  dbInstance = db
  return db
}

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbInstance) {
    return initDB()
  }
  return dbInstance
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export async function clearDB(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(DB_CONFIG.stores as unknown as StoreName[], 'readwrite')
  await Promise.all(
    Object.keys(DB_CONFIG.stores).map((storeName) =>
      tx.objectStore(storeName as StoreName).clear()
    )
  )
  await tx.done
}

export async function getById<T extends StoreName>(
  storeName: T,
  id: StoreKey<AppDB, T>
): Promise<AppDB[T]['value'] | undefined> {
  const db = await getDB()
  return db.get(storeName, id)
}

export async function getAll<T extends StoreName>(
  storeName: T
): Promise<AppDB[T]['value'][]> {
  const db = await getDB()
  return db.getAll(storeName)
}

export async function add<T extends StoreName>(
  storeName: T,
  value: AppDB[T]['value']
): Promise<StoreKey<AppDB, T>> {
  const db = await getDB()
  return db.add(storeName, value)
}

export async function put<T extends StoreName>(
  storeName: T,
  value: AppDB[T]['value']
): Promise<StoreKey<AppDB, T>> {
  const db = await getDB()
  return db.put(storeName, value)
}

export async function update<T extends StoreName>(
  storeName: T,
  id: StoreKey<AppDB, T>,
  updates: Partial<AppDB[T]['value']>
): Promise<StoreKey<AppDB, T> | undefined> {
  const db = await getDB()
  const existing = await db.get(storeName, id)
  if (!existing) return undefined
  const updated = { ...existing, ...updates } as AppDB[T]['value']
  return db.put(storeName, updated)
}

export async function remove<T extends StoreName>(
  storeName: T,
  id: StoreKey<AppDB, T>
): Promise<void> {
  const db = await getDB()
  return db.delete(storeName, id)
}

export async function getByIndex<T extends StoreName, K extends keyof AppDB[T]['indexes']>(
  storeName: T,
  indexName: K,
  value: AppDB[T]['indexes'][K]
): Promise<AppDB[T]['value'][]> {
  const db = await getDB()
  return db.getAllFromIndex(storeName, indexName as string, value as IDBValidKey)
}

export async function getFirstByIndex<T extends StoreName, K extends keyof AppDB[T]['indexes']>(
  storeName: T,
  indexName: K,
  value: AppDB[T]['indexes'][K]
): Promise<AppDB[T]['value'] | undefined> {
  const db = await getDB()
  return db.getFromIndex(storeName, indexName as string, value as IDBValidKey)
}

export async function count<T extends StoreName>(storeName: T): Promise<number> {
  const db = await getDB()
  return db.count(storeName)
}

export async function bulkAdd<T extends StoreName>(
  storeName: T,
  values: AppDB[T]['value'][]
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  await Promise.all(values.map((value) => tx.store.add(value)))
  await tx.done
}

export async function bulkPut<T extends StoreName>(
  storeName: T,
  values: AppDB[T]['value'][]
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  await Promise.all(values.map((value) => tx.store.put(value)))
  await tx.done
}

export async function bulkDelete<T extends StoreName>(
  storeName: T,
  ids: StoreKey<AppDB, T>[]
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  await Promise.all(ids.map((id) => tx.store.delete(id)))
  await tx.done
}
