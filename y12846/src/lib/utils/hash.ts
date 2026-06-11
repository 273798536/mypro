import type { FingerprintComponents } from './types';

export async function computeSHA256(data: string): Promise<string> {
  if (typeof data !== 'string') {
    throw new Error('computeSHA256 requires a string input');
  }
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return hashHex;
  } catch (error) {
    throw new Error(`SHA-256 computation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function computeSHA256Sync(data: string): string {
  if (typeof data !== 'string') {
    throw new Error('computeSHA256Sync requires a string input');
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, '0');
  const suffix = data.length.toString(16).padStart(8, '0');
  return 'fallback_' + hex + '_' + suffix;
}

export function generatePrimerFingerprint(components: FingerprintComponents): string {
  if (!components || typeof components !== 'object') {
    throw new Error('generatePrimerFingerprint requires a valid components object');
  }
  if (typeof components.name !== 'string' || components.name.trim() === '') {
    throw new Error('Primer name is required for fingerprint generation');
  }
  if (typeof components.sequence !== 'string' || components.sequence.trim() === '') {
    throw new Error('Primer sequence is required for fingerprint generation');
  }
  if (components.direction !== 'forward' && components.direction !== 'reverse') {
    throw new Error('Primer direction must be either "forward" or "reverse"');
  }
  const normalizedName = components.name.trim().toLowerCase();
  const normalizedSequence = components.sequence.trim().toUpperCase().replace(/\s+/g, '');
  const batch = components.batch ? components.batch.trim().toLowerCase() : '';
  const fingerprintString = `${normalizedName}|${normalizedSequence}|${components.direction}|${batch}`;
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(36);
  const seqHash = normalizedSequence.substring(0, 8);
  return `pr_${components.direction.charAt(0)}_${seqHash}_${hashStr}`;
}

export function generatePrimerPairFingerprint(
  forwardComponents: FingerprintComponents,
  reverseComponents: FingerprintComponents,
  name: string,
  batch?: string
): string {
  if (!forwardComponents || !reverseComponents) {
    throw new Error('Both forward and reverse primer components are required');
  }
  if (forwardComponents.direction !== 'forward') {
    throw new Error('First component must be a forward primer');
  }
  if (reverseComponents.direction !== 'reverse') {
    throw new Error('Second component must be a reverse primer');
  }
  const forwardFP = generatePrimerFingerprint(forwardComponents);
  const reverseFP = generatePrimerFingerprint(reverseComponents);
  const normalizedName = name.trim().toLowerCase();
  const normalizedBatch = batch ? batch.trim().toLowerCase() : '';
  const combined = `${normalizedName}|${normalizedBatch}|${forwardFP}|${reverseFP}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `pp_${Math.abs(hash).toString(36)}`;
}

export function generateUniqueId(prefix: string = 'id'): string {
  if (typeof prefix !== 'string' || prefix.trim() === '') {
    throw new Error('Prefix must be a non-empty string');
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

export interface DedupResult<T> {
  uniqueItems: T[];
  duplicates: T[];
  duplicatesRemoved: number;
}

export function deduplicateByKey<T>(items: T[], keyExtractor: (item: T) => string): DedupResult<T> {
  if (!Array.isArray(items)) {
    throw new Error('deduplicateByKey requires an array input');
  }
  if (typeof keyExtractor !== 'function') {
    throw new Error('keyExtractor must be a function');
  }
  const seen = new Map<string, T>();
  const duplicates: T[] = [];
  const uniqueItems: T[] = [];
  for (const item of items) {
    const key = keyExtractor(item);
    if (typeof key !== 'string') {
      throw new Error('keyExtractor must return a string');
    }
    if (seen.has(key)) {
      duplicates.push(item);
    } else {
      seen.set(key, item);
      uniqueItems.push(item);
    }
  }
  return {
    uniqueItems,
    duplicates,
    duplicatesRemoved: duplicates.length,
  };
}

export class HashCache<T> {
  private cache: Map<string, T> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be a positive integer');
    }
    this.maxSize = maxSize;
  }

  set(key: string, value: T): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Key must be a non-empty string');
    }
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get(key: string): T | undefined {
    if (typeof key !== 'string') {
      throw new Error('Key must be a string');
    }
    return this.cache.get(key);
  }

  has(key: string): boolean {
    if (typeof key !== 'string') {
      throw new Error('Key must be a string');
    }
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    if (typeof key !== 'string') {
      throw new Error('Key must be a string');
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export async function computeFileHash(file: File): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error('computeFileHash requires a File object');
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    throw new Error(`File hash computation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
