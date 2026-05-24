export interface DiffResult {
  [key: string]: {
    old: unknown;
    new: unknown;
  };
}

export function calculateDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): DiffResult {
  const changes: DiffResult = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = {
        old: oldVal,
        new: newVal,
      };
    }
  }

  return changes;
}

export function formatDiff(changes: DiffResult): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    lines.push(
      `${key}: ${JSON.stringify(value.old)} → ${JSON.stringify(value.new)}`
    );
  }
  return lines.join('\n');
}
