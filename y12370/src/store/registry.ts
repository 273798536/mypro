type AnyStore = { getState: () => unknown };

const storeMap = new Map<string, AnyStore>();

export function registerStore<T extends AnyStore>(name: string, store: T): void {
  storeMap.set(name, store);
}

export function getStore<T extends AnyStore>(name: string): T {
  const store = storeMap.get(name);
  if (!store) {
    throw new Error(
      `[StoreRegistry] "${name}" not registered. ` +
      'Make sure all stores are imported before calling store actions.',
    );
  }
  return store as T;
}
