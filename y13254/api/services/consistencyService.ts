import * as itemRepo from '../repositories/itemRepo';
import { saveItemSnapshot } from '../lib/snapshot';
import type { ConsistencyReport, NoticeItem } from '../../shared/types';

interface DiffIssue {
  field: string;
  history?: any;
  current?: any;
  api?: any;
  expected: any;
  actual: any;
  level: 'warn' | 'error';
  fixSuggestion: string;
}

export interface ConsistencyReportEx extends ConsistencyReport {
  issues: DiffIssue[];
}

function parseApiResponse(item: NoticeItem): { status: string; _isFaked: boolean } {
  try {
    if (!item.apiResponse) {
      return { status: item.status, _isFaked: true };
    }
    const parsed =
      typeof item.apiResponse === 'string'
        ? JSON.parse(item.apiResponse)
        : item.apiResponse;
    return { status: parsed?.status ?? item.status, _isFaked: false };
  } catch {
    return { status: item.status, _isFaked: true };
  }
}

function diffField(
  field: string,
  historyValue: any,
  currentValue: any,
  apiValue: any,
  isFakedApi: boolean
): DiffIssue | null {
  const apiLabel = isFakedApi ? '接口(伪造)' : '接口';
  const historyLabel = '历史备注';
  const currentLabel = '当前备注';

  const allSame =
    JSON.stringify(historyValue) === JSON.stringify(currentValue) &&
    JSON.stringify(currentValue) === JSON.stringify(apiValue);
  if (allSame) return null;

  const votes = new Map<string, number>();
  const addVote = (v: any) => {
    if (v === undefined || v === null) return;
    const key = JSON.stringify(v);
    votes.set(key, (votes.get(key) ?? 0) + 1);
  };
  addVote(historyValue);
  addVote(currentValue);
  if (!isFakedApi) addVote(apiValue);

  let expectedValue: any;
  let maxVotes = 0;
  for (const [key, cnt] of votes.entries()) {
    if (cnt > maxVotes) {
      maxVotes = cnt;
      expectedValue = JSON.parse(key);
    }
  }
  if (maxVotes < 2) {
    expectedValue = apiValue ?? currentValue;
  }

  let suggestion = '';
  if (field === 'status') {
    suggestion = `将状态从 ${String(currentValue)} 同步为 ${apiLabel}返回的 ${String(expectedValue)}`;
  } else if (field === 'currentRemark') {
    if (historyValue === expectedValue) {
      suggestion = `当前备注已变更，建议回退到${historyLabel}：${String(expectedValue ?? '空')}`;
    } else if (apiValue === expectedValue && !isFakedApi) {
      suggestion = `当前备注与${apiLabel}不一致，建议同步为：${String(expectedValue ?? '空')}`;
    } else {
      suggestion = `备注存在三方差异，建议以${historyLabel}为准：${String(historyValue ?? '空')}`;
    }
  } else {
    suggestion = `字段 ${field} 不一致，建议修正为 ${String(expectedValue)}`;
  }

  return {
    field,
    history: historyValue,
    current: currentValue,
    api: apiValue,
    expected: expectedValue,
    actual: currentValue,
    level: isFakedApi ? 'warn' : 'error',
    fixSuggestion: suggestion
  };
}

export async function checkAll(): Promise<ConsistencyReportEx[]> {
  const items = itemRepo.listItems();
  const reports: ConsistencyReportEx[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    const issues: DiffIssue[] = [];

    const lastHistory =
      item.remarkHistory && item.remarkHistory.length > 0
        ? item.remarkHistory[0].remark
        : null;
    const historyRemarkIssue = diffField(
      'currentRemark',
      lastHistory,
      item.currentRemark,
      item.currentRemark,
      true
    );
    if (historyRemarkIssue) {
      historyRemarkIssue.fixSuggestion =
        `历史备注(${String(lastHistory ?? '空')})与当前备注(${String(item.currentRemark ?? '空')})不一致，` +
        historyRemarkIssue.fixSuggestion;
      issues.push(historyRemarkIssue);
    }

    const apiParsed = parseApiResponse(item);
    const statusIssue = diffField(
      'status',
      item.status,
      item.status,
      apiParsed.status,
      apiParsed._isFaked
    );
    if (statusIssue && statusIssue.current !== statusIssue.api) {
      issues.push(statusIssue);
    }

    if (issues.length > 0) {
      reports.push({
        itemId: item.id,
        issues,
        generatedAt: now
      });
    }
  }

  return reports;
}

export async function fixOne(payload: {
  itemId: string;
  applyField: string;
}): Promise<NoticeItem> {
  const item = itemRepo.getItemById(payload.itemId);
  if (!item) {
    throw new Error(`未找到 item: ${payload.itemId}`);
  }

  const reports = await checkAll();
  const myReport = reports.find((r) => r.itemId === payload.itemId);
  if (!myReport) {
    throw new Error(`该 item 无不一致记录`);
  }

  const issue = myReport.issues.find((i) => i.field === payload.applyField);
  if (!issue) {
    throw new Error(`字段 ${payload.applyField} 无需要修复的不一致`);
  }

  let updatedItem: NoticeItem | null = null;

  if (payload.applyField === 'status') {
    updatedItem = itemRepo.updateItemStatus(payload.itemId, issue.expected as any);
  } else if (payload.applyField === 'currentRemark') {
    updatedItem = itemRepo.updateItemRemark(payload.itemId, String(issue.expected ?? ''));
  } else {
    throw new Error(`暂不支持修复字段: ${payload.applyField}`);
  }

  if (!updatedItem) {
    throw new Error(`修复失败，字段未更新`);
  }

  await saveItemSnapshot(updatedItem.id, {
    status: updatedItem.status,
    currentRemark: updatedItem.currentRemark
  });

  return updatedItem;
}
