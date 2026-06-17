import { ImportResult } from '../types';
export interface QuestionImportRow {
    question_id: string;
    question_text: string;
    domain_tags?: string;
    annotation_status?: 'none' | 'partial' | 'full';
    annotation_note?: string;
}
export declare function getEvaluationSetByName(name: string): any;
export declare function getEvaluationSetById(id: number): any;
export declare function listEvaluationSets(page?: number, pageSize?: number): {
    items: any[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function createEvaluationSet(name: string, description?: string, source?: string): number;
export declare function importQuestions(evaluationSetId: number, rows: QuestionImportRow[]): ImportResult;
export declare function listQuestions(evaluationSetId: number, page?: number, pageSize?: number, annotationStatus?: string): {
    items: any[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function updateQuestionAnnotation(evaluationSetId: number, questionId: string, annotationStatus: 'none' | 'partial' | 'full', domainTags?: string, annotationNote?: string): {
    success: boolean;
};
