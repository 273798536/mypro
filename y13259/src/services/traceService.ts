import { useGisStore } from '@/store/useGisStore';
import { useCalculationStore } from '@/store/useCalculationStore';
import { usePublicListStore } from '@/store/usePublicListStore';
import type { TraceData, PublicListItem } from '@/types';

export const getFullTraceData = (itemId: string): TraceData | null => {
  const { getItemById } = usePublicListStore.getState();
  const { getPointById } = useGisStore.getState();
  const { getRuleById } = useCalculationStore.getState();

  const listItem = getItemById(itemId);
  if (!listItem) return null;

  const gisPoint = getPointById(listItem.gisPointId);
  if (!gisPoint) return null;

  const calculationRule = getRuleById(listItem.calculationId);
  if (!calculationRule) return null;

  return { listItem, gisPoint, calculationRule };
};

export const getTraceChainDescription = (item: PublicListItem): string => {
  const traceData = getFullTraceData(item.id);
  if (!traceData) return '无法追溯数据来源';

  const { gisPoint, calculationRule } = traceData;
  return `数据来源：${gisPoint.source} → 计算模型：${calculationRule.name} v${calculationRule.version} → 生成时间：${item.createdAt}`;
};

export const navigateToGisPoint = (gisPointId: string): void => {
  const { highlightPoint } = useGisStore.getState();
  highlightPoint(gisPointId);
};

export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateShort = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
