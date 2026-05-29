export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
};

export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

export const clearStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export const getIndexedDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ParkingRenewalDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('licensePlates')) {
        db.createObjectStore('licensePlates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('monthlyCards')) {
        db.createObjectStore('monthlyCards', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('tempParkingRecords')) {
        db.createObjectStore('tempParkingRecords', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('discounts')) {
        db.createObjectStore('discounts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('renewalRecords')) {
        db.createObjectStore('renewalRecords', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('badRows')) {
        db.createObjectStore('badRows', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('importSessions')) {
        db.createObjectStore('importSessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('exportRecords')) {
        db.createObjectStore('exportRecords', { keyPath: 'id' });
      }
    };
  });
};

export const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
};

export const addToStore = async <T>(storeName: string, data: T): Promise<void> => {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const bulkAddToStore = async <T>(storeName: string, data: T[]): Promise<void> => {
  if (data.length === 0) return;
  
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    data.forEach((item) => {
      store.put(item);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const updateStoreItem = async <T>(storeName: string, data: T): Promise<void> => {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteFromStore = async (storeName: string, id: string): Promise<void> => {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearStore = async (storeName: string): Promise<void> => {
  const db = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
