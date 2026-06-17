import type { StandardComplaint, MergeSuggestion } from '@/shared/types';

function summarizeContent(content: string, maxLen = 30): string {
  if (!content) return '';
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + '…';
}

function formatTime(occurredAt: string): string {
  if (!occurredAt) return '';
  try {
    const d = new Date(occurredAt);
    if (isNaN(d.getTime())) return occurredAt;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return occurredAt;
  }
}

function normalizeIntersectionKey(intersection: string): string {
  if (!intersection) return '__unknown__';
  return intersection
    .replace(/\s+/g, '')
    .replace(/[·・\-—]/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .toLowerCase();
}

export function detectMergeGroups(
  complaints: StandardComplaint[]
): MergeSuggestion[] {
  const groups = new Map<string, StandardComplaint[]>();

  for (const c of complaints) {
    if (c.status === '已归并' && c.mergeGroupId) {
      continue;
    }
    const key = normalizeIntersectionKey(c.intersection);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(c);
  }

  const suggestions: MergeSuggestion[] = [];
  let groupCounter = 1;

  for (const [, list] of groups) {
    if (list.length < 2) continue;

    const sorted = [...list].sort((a, b) => {
      const ta = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const tb = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return ta - tb;
    });

    const id = `merge-${String(groupCounter).padStart(3, '0')}`;
    groupCounter++;

    const differences = sorted.map(c => ({
      complaintId: c.id,
      occurredAt: formatTime(c.occurredAt),
      source: c.source,
      status: c.status,
      contentSummary: summarizeContent(c.content)
    }));

    suggestions.push({
      groupId: id,
      intersection: sorted[0].intersection,
      complaintIds: sorted.map(c => c.id),
      differences
    });
  }

  suggestions.sort((a, b) => b.complaintIds.length - a.complaintIds.length);

  return suggestions;
}
