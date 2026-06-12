import type { FilterCriteria } from './types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

export function filterCriteriaToSearchParams(filter: FilterCriteria): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filter.corridorId) params.set('corridorId', filter.corridorId);
  if (filter.startDate) params.set('startDate', filter.startDate);
  if (filter.endDate) params.set('endDate', filter.endDate);
  if (filter.recordType?.length) params.set('recordType', filter.recordType.join(','));
  if (filter.status?.length) params.set('status', filter.status.join(','));
  if (filter.isOverlapping !== undefined) params.set('isOverlapping', String(filter.isOverlapping));
  if (filter.searchKeyword) params.set('searchKeyword', filter.searchKeyword);
  
  return params;
}

export function searchParamsToFilterCriteria(params: URLSearchParams): FilterCriteria {
  const filter: FilterCriteria = {};
  
  if (params.has('corridorId')) filter.corridorId = params.get('corridorId')!;
  if (params.has('startDate')) filter.startDate = params.get('startDate')!;
  if (params.has('endDate')) filter.endDate = params.get('endDate')!;
  if (params.has('recordType')) filter.recordType = params.get('recordType')!.split(',') as any[];
  if (params.has('status')) filter.status = params.get('status')!.split(',') as any[];
  if (params.has('isOverlapping')) filter.isOverlapping = params.get('isOverlapping') === 'true';
  if (params.has('searchKeyword')) filter.searchKeyword = params.get('searchKeyword')!;
  
  return filter;
}

export function detectOverlap(records: { corridorId: string; recordDate: string }[]): string[] {
  const overlappingIds: string[] = [];
  const dateMap = new Map<string, number>();
  
  records.forEach(r => {
    const key = `${r.corridorId}-${r.recordDate}`;
    dateMap.set(key, (dateMap.get(key) || 0) + 1);
  });
  
  records.forEach((r, idx) => {
    const key = `${r.corridorId}-${r.recordDate}`;
    if (dateMap.get(key)! > 1) {
      overlappingIds.push((r as any).id || String(idx));
    }
  });
  
  return overlappingIds;
}
