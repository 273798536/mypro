function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }
  
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return `"${obj}"`;
    }
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    const items = obj.map(item => stableStringify(item)).join(',');
    return `[${items}]`;
  }
  
  const sortedKeys = Object.keys(obj as object).sort();
  const pairs = sortedKeys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    return `"${key}":${stableStringify(value)}`;
  }).join(',');
  
  return `{${pairs}}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function generateIdempotencyKey(
  params: Record<string, unknown>,
  salt?: string
): string {
  const normalized = stableStringify(params);
  const salted = salt ? `${salt}:${normalized}` : normalized;
  const hash = simpleHash(salted);
  return `idempotency-${hash}`;
}

export function verifyIdempotency(
  key1: string,
  key2: string
): boolean {
  return key1 === key2;
}

export interface IdempotencyRecord {
  key: string;
  timestamp: string;
  inputHash: string;
  outputHash: string;
}

export class IdempotencyManager {
  private records: Map<string, IdempotencyRecord> = new Map();
  
  check(key: string): IdempotencyRecord | null {
    return this.records.get(key) || null;
  }
  
  record(
    key: string,
    input: unknown,
    output: unknown
  ): void {
    const record: IdempotencyRecord = {
      key,
      timestamp: new Date().toISOString(),
      inputHash: simpleHash(stableStringify(input)),
      outputHash: simpleHash(stableStringify(output))
    };
    this.records.set(key, record);
  }
  
  clear(): void {
    this.records.clear();
  }
  
  getAll(): IdempotencyRecord[] {
    return Array.from(this.records.values());
  }
}

export const idempotencyManager = new IdempotencyManager();

export function runIdempotencyTest(
  fn: () => unknown,
  iterations: number = 3
): { passed: boolean; message: string; results: unknown[] } {
  const results: unknown[] = [];
  
  for (let i = 0; i < iterations; i++) {
    results.push(fn());
  }
  
  const firstResult = stableStringify(results[0]);
  const allSame = results.every(r => stableStringify(r) === firstResult);
  
  if (allSame) {
    return {
      passed: true,
      message: `幂等性测试通过：${iterations}次运行结果完全一致`,
      results
    };
  } else {
    const differences: string[] = [];
    for (let i = 1; i < results.length; i++) {
      if (stableStringify(results[i]) !== firstResult) {
        differences.push(`第${i + 1}次运行与第1次运行结果不同`);
      }
    }
    return {
      passed: false,
      message: `幂等性测试失败：${differences.join('；')}`,
      results
    };
  }
}
