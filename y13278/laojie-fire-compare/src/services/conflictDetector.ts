import { v4 as uuidv4 } from 'uuid';
import type { FirePlan, ConflictInfo, ConflictSeverity } from '../types';

const SAME_LOCATION_ALIASES = [
  ['老街口', '街口', '老街入口', '正街北口'],
  ['老槐树', '大槐树', '古槐树'],
  ['消防栓', '消火栓', '水栓'],
  ['配电房', '配电室', '供电房'],
  ['居委会', '社区办公室', '街道办'],
];

export function normalizeLocationName(name: string): string {
  let n = name.trim().toLowerCase();
  n = n.replace(/[\s，,。.、]/g, '');
  for (const group of SAME_LOCATION_ALIASES) {
    for (const alias of group) {
      if (n.includes(alias)) return group[0];
    }
  }
  return n;
}

export function detectConflicts(
  plan: FirePlan,
  field: string,
  oldValue: unknown,
  newValue: unknown,
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  if (field === 'sceneSummary' || field === 'sideNote') {
    const oldStr = String(oldValue || '');
    const newStr = String(newValue || '');

    if (oldStr && newStr && oldStr !== newStr) {
      const oldLocs = extractLocationMentions(oldStr);
      const newLocs = extractLocationMentions(newStr);

      for (const oldLoc of oldLocs) {
        for (const newLoc of newLocs) {
          const normOld = normalizeLocationName(oldLoc);
          const normNew = normalizeLocationName(newLoc);
          if (normOld === normNew && oldLoc !== newLoc) {
            conflicts.push({
              id: uuidv4(),
              planId: plan.id,
              severity: 'warning' as ConflictSeverity,
              title: '同一地点多种命名',
              detail: `场景描述中出现「${oldLoc}」和「${newLoc}」，疑似为同一地点的不同写法，请确认后统一命名。`,
              affectedFields: [field],
              detectedAt: Date.now(),
              resolved: false,
            });
          }
        }
      }

      if (plan.version > 3 && oldStr.length > newStr.length) {
        const removed = findRemovedContent(oldStr, newStr);
        if (removed.length > 0) {
          conflicts.push({
            id: uuidv4(),
            planId: plan.id,
            severity: 'critical' as ConflictSeverity,
            title: '新内容覆盖了早期关键判断',
            detail: `检测到本次更新可能删除了历史记录中的重要信息：\n${removed
              .slice(0, 3)
              .map(r => '· ' + r)
              .join('\n')}\n\n请确认是否为有意删除，方案已挂起等待复核。`,
            affectedFields: [field],
            detectedAt: Date.now(),
            resolved: false,
          });
        }
      }
    }
  }

  return conflicts;
}

function extractLocationMentions(text: string): string[] {
  const locRegex = /[\u4e00-\u9fa5]{2,6}(?:街|巷|路|口|树|栓|房|处|点)/g;
  const matches = text.match(locRegex);
  return matches ? [...new Set(matches)] : [];
}

function findRemovedContent(oldStr: string, newStr: string): string[] {
  const oldSentences = oldStr.split(/[。！？\n]/).filter(s => s.trim().length > 4);
  const removed: string[] = [];
  for (const sent of oldSentences) {
    if (!newStr.includes(sent.trim().slice(0, 5))) {
      removed.push(sent.trim());
    }
  }
  return removed;
}
