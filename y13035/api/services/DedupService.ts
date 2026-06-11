import type { Material } from '@shared/types';

export class DedupService {
  private hashMaterial(m: Material): string {
    const normalizedName = m.name.trim().toLowerCase().replace(/\s+/g, '');
    return `${m.type}::${normalizedName}`;
  }

  dedup(existing: Material[], incoming: Material[]): Material[] {
    const seen = new Set(existing.map(this.hashMaterial));
    const result: Material[] = [...existing];
    for (const m of incoming) {
      const key = this.hashMaterial(m);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ ...m });
      } else {
        result.push({ ...m, isDuplicate: true });
      }
    }
    return result;
  }

  countUnique(materials: Material[]): number {
    const seen = new Set<string>();
    for (const m of materials) {
      if (m.isDuplicate) continue;
      seen.add(this.hashMaterial(m));
    }
    return seen.size;
  }
}

export const dedupService = new DedupService();
