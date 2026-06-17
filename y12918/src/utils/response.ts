import { Response } from 'express';
import { ApiResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public details?: string[];

  constructor(message: string, statusCode: number = 400, details?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export function successResponse<T>(res: Response, data: T, message: string = 'success'): void {
  const response: ApiResponse<T> = {
    code: 0,
    message,
    data,
  };
  res.json(response);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 400,
  errors?: string[]
): void {
  const response: ApiResponse = {
    code: statusCode,
    message,
    errors,
  };
  res.status(statusCode).json(response);
}

export function getMissingAnnotationMessage(
  reportId: number,
  missingCount: number,
  sampleItems: Array<{ question_id: string; question_text: string }>
): string {
  const samples = sampleItems.slice(0, 5).map(
    (item) => `  - 题目ID: ${item.question_id}, 题目: ${item.question_text.substring(0, 30)}...`
  ).join('\n');
  return `报告 #${reportId} 尚有 ${missingCount} 条题目缺少标注记录，无法完成复核。\n请先补录以下题目的领域标注：\n${samples}\n共 ${missingCount > 5 ? `... 等共 ${missingCount} 条` : ''}`;
}
