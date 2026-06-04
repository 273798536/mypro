export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix.toUpperCase()}-${timestamp}-${random}`;
}

export const ID_PREFIXES = {
  ANNOTATION: 'ANNO',
  SNAPSHOT: 'SNAP',
  ANOMALY: 'ANOM',
  PROCESS_NOTE: 'NOTE',
  COLLISION: 'COLL',
  BALL: 'BALL',
  REPORT: 'REPORT',
} as const;
