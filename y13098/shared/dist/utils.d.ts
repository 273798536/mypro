import type { FilterCriteria } from './types';
export declare function generateId(): string;
export declare function formatDate(date: string | Date, format?: string): string;
export declare function filterCriteriaToSearchParams(filter: FilterCriteria): URLSearchParams;
export declare function searchParamsToFilterCriteria(params: URLSearchParams): FilterCriteria;
export declare function detectOverlap(records: {
    corridorId: string;
    recordDate: string;
}[]): string[];
