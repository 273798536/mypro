import type {
  RawComplaint,
  StandardComplaint,
  FieldMapping,
  FilterState,
  ApiLog,
  MergeSuggestion,
  CoordIssue,
} from '@/shared/types';

import { batch1Old, batch2New, batch3PM } from '@/mock/complaints';
import { parks } from '@/mock/parks';
import { cityBlocks } from '@/mock/blocks';

import { mapToStandard, DEFAULT_MAPPING } from '@/utils/fieldMapper';
import { validateCoord, COORD_OFFSET_THRESHOLD } from '@/utils/coordValidator';
import { detectMergeGroups } from '@/utils/mergeDetector';
import { createInitialHistory } from '@/utils/historyTrail';

export interface StartResult {
  raw: RawComplaint[];
  standard: StandardComplaint[];
  logs: ApiLog[];
  mergeSuggestions: MergeSuggestion[];
  coordIssues: CoordIssue[];
  parks: typeof parks;
  blocks: typeof cityBlocks;
}

export interface RerunResult {
  raw: RawComplaint[];
  standard: StandardComplaint[];
  logs: ApiLog[];
  mergeSuggestions: MergeSuggestion[];
}

export interface ViewResult {
  rawJson: string;
  mappedTable: Record<string, unknown>[];
  logs: ApiLog[];
}

const logs: ApiLog[] = [];

function sleep(minMs = 300, maxMs = 800): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function addLog(log: ApiLog) {
  logs.push(log);
}

function rawToStandard(raw: RawComplaint, mapping: FieldMapping): StandardComplaint {
  const mapped = mapToStandard(raw, mapping);
  const now = new Date();

  const complaint: StandardComplaint = {
    id: mapped.id,
    occurredAt: mapped.occurredAt || now.toISOString(),
    intersection: mapped.intersection || '未知街口',
    lng: typeof mapped.lng === 'number' ? mapped.lng : 0,
    lat: typeof mapped.lat === 'number' ? mapped.lat : 0,
    source: mapped.source || '其他',
    status: mapped.status || '待确认',
    content: mapped.content || '',
    raw: mapped.raw,
    history: [createInitialHistory(raw)],
  };

  return complaint;
}

function applyCoordValidation(list: StandardComplaint[]): {
  list: StandardComplaint[];
  issues: CoordIssue[];
} {
  const issues: CoordIssue[] = [];
  const newList = list.map((c) => {
    const issue = validateCoord(c, parks);
    if (issue) {
      issues.push(issue);
      return {
        ...c,
        coordIssue: issue,
        status: '坐标异常' as const,
      };
    }
    return c;
  });
  return { list: newList, issues };
}

function applyFilters(
  list: StandardComplaint[],
  filters: FilterState
): StandardComplaint[] {
  return list.filter((c) => {
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      const t = c.occurredAt ? new Date(c.occurredAt.replace(' ', 'T')).getTime() : 0;
      if (filters.dateRange.start) {
        const s = new Date(filters.dateRange.start).getTime();
        if (t < s) return false;
      }
      if (filters.dateRange.end) {
        const e = new Date(filters.dateRange.end).getTime();
        if (t > e) return false;
      }
    }
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(c.source)) return false;
    }
    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(c.status)) return false;
    }
    if (filters.intersections && filters.intersections.length > 0) {
      if (!filters.intersections.includes(c.intersection)) return false;
    }
    if (filters.hasCoordIssue === true) {
      if (!c.coordIssue) return false;
    } else if (filters.hasCoordIssue === false) {
      if (c.coordIssue) return false;
    }
    if (filters.keyword && filters.keyword.trim()) {
      const kw = filters.keyword.trim().toLowerCase();
      const hay = `${c.intersection} ${c.content} ${c.source}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

function buildMappedTable(
  complaints: StandardComplaint[],
  mapping: FieldMapping = DEFAULT_MAPPING
): Record<string, unknown>[] {
  return complaints.map((c) => ({
    标准字段_ID: c.id,
    标准字段_时间: c.occurredAt,
    标准字段_街口: c.intersection,
    标准字段_经度: c.lng,
    标准字段_纬度: c.lat,
    标准字段_来源: c.source,
    标准字段_状态: c.status,
    标准字段_内容: c.content,
    坐标异常偏移: c.coordIssue ? `${c.coordIssue.offsetMeters}m` : '无',
    疑似正确街口: c.coordIssue?.suspectedIntersection || '',
    历史记录数: c.history.length,
    _映射来源候选: mapping.source.join(' / '),
    _原始记录ID: c.raw._id,
  }));
}

export async function start(mapping: FieldMapping): Promise<StartResult> {
  const t0 = Date.now();
  await sleep();

  const allBatches = [...batch1Old, ...batch2New, ...batch3PM];
  const standardList = allBatches.map((r) => rawToStandard(r, mapping));
  const { list: validated, issues } = applyCoordValidation(standardList);
  const mergeSuggestions = detectMergeGroups(validated);

  const t1 = Date.now();
  const log: ApiLog = {
    ts: new Date().toISOString(),
    method: 'start',
    request: { mapping, threshold: COORD_OFFSET_THRESHOLD },
    response: {
      rawCount: allBatches.length,
      standardCount: validated.length,
      coordIssueCount: issues.length,
      mergeSuggestionCount: mergeSuggestions.length,
      mergeSuggestionIds: mergeSuggestions.map((m) => m.groupId),
    },
    status: 200,
    durationMs: t1 - t0,
  };
  addLog(log);

  return {
    raw: allBatches,
    standard: validated,
    logs: [...logs],
    mergeSuggestions,
    coordIssues: issues,
    parks,
    blocks: cityBlocks,
  };
}

export async function rerun(
  filters: FilterState,
  prevStandard: StandardComplaint[]
): Promise<RerunResult> {
  const t0 = Date.now();
  await sleep();

  const filteredBase = applyFilters(prevStandard, filters);
  const revalidatedIds = new Set<string>();
  const rerunList = filteredBase.map((c) => {
    if (c.coordIssue || filters.statuses?.includes('坐标异常')) {
      revalidatedIds.add(c.id);
      const issue = validateCoord(c, parks);
      if (issue) {
        return { ...c, coordIssue: issue, status: '坐标异常' as const };
      }
      const { coordIssue, ...rest } = c;
      void coordIssue;
      return {
        ...rest,
        status: (rest.status === '坐标异常' ? '待确认' : rest.status) as StandardComplaint['status'],
      };
    }
    return c;
  });

  const mergeSuggestions = detectMergeGroups(rerunList);

  const t1 = Date.now();
  const log: ApiLog = {
    ts: new Date().toISOString(),
    method: 'rerun',
    request: { filters, inputCount: prevStandard.length },
    response: {
      outputCount: rerunList.length,
      revalidatedCount: revalidatedIds.size,
      revalidatedIds: [...revalidatedIds],
      mergeSuggestionCount: mergeSuggestions.length,
    },
    status: 200,
    durationMs: t1 - t0,
  };
  addLog(log);

  return {
    raw: rerunList.map((c) => c.raw),
    standard: rerunList,
    logs: [...logs],
    mergeSuggestions,
  };
}

export async function view(
  complaints: StandardComplaint[],
  complaintId?: string
): Promise<ViewResult> {
  const t0 = Date.now();
  await sleep();

  const targetList = complaintId
    ? complaints.filter((c) => c.id === complaintId)
    : complaints;

  const rawJson = JSON.stringify(
    {
      total: targetList.length,
      items: targetList.map((c) => c.raw),
    },
    null,
    2
  );
  const mappedTable = buildMappedTable(targetList);

  const t1 = Date.now();
  const log: ApiLog = {
    ts: new Date().toISOString(),
    method: 'view',
    request: { complaintId, targetCount: targetList.length },
    response: {
      rawJsonLength: rawJson.length,
      mappedTableRows: mappedTable.length,
    },
    status: 200,
    durationMs: t1 - t0,
  };
  addLog(log);

  return {
    rawJson,
    mappedTable,
    logs: [...logs],
  };
}

export function getApiLogs(): ApiLog[] {
  return [...logs];
}

export function clearApiLogs() {
  logs.length = 0;
}
