type AnyStore = { getState: () => unknown };

const storeMap = new Map<string, AnyStore>();
const requiredStores = ['data', 'history', 'booking', 'conflict'] as const;

export function registerStore<T extends AnyStore>(name: string, store: T): void {
  if (storeMap.has(name)) {
    console.warn(`[StoreRegistry] Store "${name}" is already registered, overwriting.`);
  }
  storeMap.set(name, store);
}

export function getStore<T extends AnyStore>(name: string): T {
  const store = storeMap.get(name);
  if (!store) {
    const registered = Array.from(storeMap.keys());
    const missing = requiredStores.filter(s => !storeMap.has(s));
    throw new Error(
      `[StoreRegistry] Store "${name}" is not available.\n` +
      `Registered stores: [${registered.join(', ') || 'none'}]\n` +
      `Missing required stores: [${missing.join(', ') || 'none'}]\n` +
      `This usually happens if store files are not imported in the correct order.\n` +
      `Ensure "import './store'" is called in your entry file before any components render.`,
    );
  }
  return store as T;
}

export function validateStores(): { ok: boolean; missing: string[]; registered: string[] } {
  const registered = Array.from(storeMap.keys());
  const missing = requiredStores.filter(s => !storeMap.has(s));
  return {
    ok: missing.length === 0,
    missing,
    registered,
  };
}

export function getRegisteredStores(): string[] {
  return Array.from(storeMap.keys());
}
