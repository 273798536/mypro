export function genId(prefix = 'ID'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function genBatchId(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const seq = Math.floor(Math.random() * 900 + 100);
  return `BATCH-${date}-${seq}`;
}
