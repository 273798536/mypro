import { Response } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    details?: string[];
    constructor(message: string, statusCode?: number, details?: string[]);
}
export declare function successResponse<T>(res: Response, data: T, message?: string): void;
export declare function errorResponse(res: Response, message: string, statusCode?: number, errors?: string[]): void;
export declare function getMissingAnnotationMessage(reportId: number, missingCount: number, sampleItems: Array<{
    question_id: string;
    question_text: string;
}>): string;
