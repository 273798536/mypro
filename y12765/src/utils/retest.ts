import type { AdditiveItem, RetestSuggestion, RetestPriority } from '@/types';
import { evaluateAlertLevel } from './safety';

function decidePriority(item: AdditiveItem): RetestPriority {
  const level = evaluateAlertLevel(item);
  if (level === 'danger') return 'high';
  if (level === 'warning') return 'medium';
  return 'low';
}

export function buildRetestSuggestion(item: AdditiveItem): RetestSuggestion | null {
  const level = evaluateAlertLevel(item);
  if (level === 'safe' && Math.random() > 0.15) return null;

  const priority = decidePriority(item);
  let reason = '';
  let method = '';
  let sampleCount = 0;

  if (level === 'danger') {
    reason = `${item.name} 超过国家标准限量，必须启动不合格复测流程，留样双人复核`;
    method = '按照 GB/T 27404 要求对留样进行平行样检测，每样做 2 个平行，同时更换检测人员';
    sampleCount = 6;
  } else if (level === 'warning') {
    reason = `${item.name} 实测值接近限量值（≥80%），存在工艺波动导致超标的风险`;
    method = '对同批次相邻时间段留样追加检测，每个时间点做平行样，核查温度曲线与工艺记录';
    sampleCount = 4;
  } else {
    reason = `${item.name} 按日常抽检比例随机抽回复核，用于监控方法稳定性`;
    method = '由复核人员对原记录进行数据审核，必要时对原始图谱积分重新计算';
    sampleCount = 2;
  }

  return {
    id: `retest-${item.id}`,
    recordId: item.recordId,
    reason,
    sampleCount,
    method,
    priority,
    additiveName: item.name,
  };
}

export function generateAllRetestSuggestions(items: AdditiveItem[]): RetestSuggestion[] {
  return items
    .map(buildRetestSuggestion)
    .filter((s): s is RetestSuggestion => s !== null)
    .sort((a, b) => {
      const order: Record<RetestPriority, number> = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
}
