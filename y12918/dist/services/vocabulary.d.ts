import { ImportResult } from '../types';
export interface VocabTermRow {
    term: string;
    category?: string;
}
export declare function getVocabularyByName(name: string, domain: string): any;
export declare function getVocabularyById(id: number): any;
export declare function listVocabularies(page?: number, pageSize?: number): {
    items: any[];
    total: any;
    page: number;
    pageSize: number;
};
export declare function createVocabulary(name: string, domain: string): number;
export declare function importVocabTerms(vocabularyId: number, rows: VocabTermRow[]): ImportResult;
export declare function listVocabTerms(vocabularyId: number, page?: number, pageSize?: number, category?: string): {
    items: any[];
    total: any;
    page: number;
    pageSize: number;
};
export declare function getAllVocabTerms(vocabularyId: number): string[];
