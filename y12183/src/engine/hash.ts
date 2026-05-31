export function deterministicStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const sorted = [...obj].sort((a, b) => {
      const aKey = getSortKey(a);
      const bKey = getSortKey(b);
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
    const items = sorted.map((item) => deterministicStringify(item));
    return '[' + items.join(',') + ']';
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const pairs = sortedKeys.map((key) => {
    const val = record[key];
    return JSON.stringify(key) + ':' + deterministicStringify(val);
  });
  return '{' + pairs.join(',') + '}';
}

function getSortKey(item: unknown): string {
  if (item === null || item === undefined) {
    return String(item);
  }
  if (typeof item === 'object' && !Array.isArray(item)) {
    const record = item as Record<string, unknown>;
    if ('id' in record && typeof record.id === 'string') {
      return record.id;
    }
    return Object.keys(record).sort().map((k) => k + ':' + String(record[k])).join(',');
  }
  return String(item);
}

export function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff;
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return hex;
}
