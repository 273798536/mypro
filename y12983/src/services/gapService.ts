import type { GapReport, ListParams, PagedResult, CreateGapData, UpdateGapData, DuplicateResult } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { generateFingerprint, calculateSimilarity, findDuplicateReason } from '@/utils/fingerprint';
import { getMockGaps } from '@/mock/gaps';

const STORAGE_KEY = 'gaps';

const getAllGaps = (): GapReport[] => {
  return storage.get<GapReport[]>(STORAGE_KEY, []);
};

const saveAllGaps = (gaps: GapReport[]): void => {
  storage.set(STORAGE_KEY, gaps);
};

export const gapService = {
  list(params: ListParams = {}): PagedResult<GapReport> {
    const {
      page = 1,
      pageSize = 10,
      status,
      severity,
      gapType,
      tableName,
      businessLine,
      keyword,
    } = params;

    let gaps = getAllGaps();

    if (status) {
      gaps = gaps.filter((g) => g.status === status);
    }
    if (severity) {
      gaps = gaps.filter((g) => g.severity === severity);
    }
    if (gapType) {
      gaps = gaps.filter((g) => g.gapType === gapType);
    }
    if (tableName) {
      gaps = gaps.filter((g) => g.tableName.includes(tableName));
    }
    if (businessLine) {
      gaps = gaps.filter((g) => g.businessLine.includes(businessLine));
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      gaps = gaps.filter(
        (g) =>
          g.title.toLowerCase().includes(kw) ||
          g.description.toLowerCase().includes(kw) ||
          g.tableName.toLowerCase().includes(kw)
      );
    }

    gaps.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());

    const total = gaps.length;
    const start = (page - 1) * pageSize;
    const list = gaps.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  },

  get(id: string): GapReport | null {
    const gaps = getAllGaps();
    return gaps.find((g) => g.id === id) || null;
  },

  create(data: CreateGapData): GapReport {
    const gaps = getAllGaps();
    const now = new Date().toISOString();
    const fingerprint = generateFingerprint(data);

    const newGap: GapReport = {
      id: 'gap_' + generateId(),
      ...data,
      status: 'pending',
      discoveredAt: now,
      fingerprint,
    };

    gaps.unshift(newGap);
    saveAllGaps(gaps);

    return newGap;
  },

  update(id: string, data: UpdateGapData): GapReport | null {
    const gaps = getAllGaps();
    const index = gaps.findIndex((g) => g.id === id);

    if (index === -1) return null;

    gaps[index] = { ...gaps[index], ...data };
    saveAllGaps(gaps);

    return gaps[index];
  },

  updateStatus(id: string, status: GapReport['status']): GapReport | null {
    return this.update(id, { status });
  },

  conclude(id: string, conclusion: string, operator: string): GapReport | null {
    const gaps = getAllGaps();
    const index = gaps.findIndex((g) => g.id === id);

    if (index === -1) return null;

    const now = new Date().toISOString();
    gaps[index] = {
      ...gaps[index],
      conclusion,
      concludedBy: operator,
      concludedAt: now,
      status: 'fixed',
    };
    saveAllGaps(gaps);

    return gaps[index];
  },

  detectDuplicates(data: CreateGapData, threshold = 0.7): DuplicateResult[] {
    const gaps = getAllGaps();
    const fingerprint = generateFingerprint(data);

    const results: DuplicateResult[] = [];
    const tempGap: GapReport = {
      id: 'temp',
      ...data,
      status: 'pending',
      discoveredAt: new Date().toISOString(),
      fingerprint,
      source: data.source,
    };

    for (const gap of gaps) {
      const similarity = calculateSimilarity(tempGap, gap);
      if (similarity >= threshold) {
        results.push({
          gap,
          similarity,
          reason: findDuplicateReason(tempGap, gap),
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  },

  detectDuplicatesById(id: string, threshold = 0.7): DuplicateResult[] {
    const gaps = getAllGaps();
    const currentGap = gaps.find((g) => g.id === id);
    if (!currentGap) return [];

    const results: DuplicateResult[] = [];
    for (const gap of gaps) {
      if (gap.id === id) continue;
      const similarity = calculateSimilarity(currentGap, gap);
      if (similarity >= threshold) {
        results.push({
          gap,
          similarity,
          reason: findDuplicateReason(currentGap, gap),
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results;
  },

  mergeDuplicates(targetId: string, sourceIds: string[]): GapReport | null {
    const gaps = getAllGaps();
    const targetIndex = gaps.findIndex((g) => g.id === targetId);

    if (targetIndex === -1) return null;

    const sourceGaps = gaps.filter((g) => sourceIds.includes(g.id));
    const target = gaps[targetIndex];

    const mergedDescription = target.description + '\n\n--- 合并记录 ---\n' +
      sourceGaps.map((g) => `[${g.id}] ${g.description}`).join('\n');

    target.description = mergedDescription;
    target.affectedRows = Math.max(
      target.affectedRows || 0,
      ...sourceGaps.map((g) => g.affectedRows || 0)
    );

    const remainingGaps = gaps.filter((g) => !sourceIds.includes(g.id));
    saveAllGaps(remainingGaps);

    return target;
  },

  getStats() {
    const gaps = getAllGaps();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: gaps.length,
      pending: gaps.filter((g) => g.status === 'pending').length,
      processing: gaps.filter((g) => g.status === 'processing').length,
      fixed: gaps.filter((g) => g.status === 'fixed').length,
      ignored: gaps.filter((g) => g.status === 'ignored').length,
      thisMonthNew: gaps.filter((g) => new Date(g.discoveredAt) >= thisMonth).length,
      critical: gaps.filter((g) => g.severity === 'critical' && g.status !== 'fixed' && g.status !== 'ignored').length,
    };
  },

  resetToMock(): void {
    saveAllGaps(getMockGaps());
  },
};
