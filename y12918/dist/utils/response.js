"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.getMissingAnnotationMessage = getMissingAnnotationMessage;
class AppError extends Error {
    constructor(message, statusCode = 400, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function successResponse(res, data, message = 'success') {
    const response = {
        code: 0,
        message,
        data,
    };
    res.json(response);
}
function errorResponse(res, message, statusCode = 400, errors) {
    const response = {
        code: statusCode,
        message,
        errors,
    };
    res.status(statusCode).json(response);
}
function getMissingAnnotationMessage(reportId, missingCount, sampleItems) {
    const samples = sampleItems.slice(0, 5).map((item) => `  - 题目ID: ${item.question_id}, 题目: ${item.question_text.substring(0, 30)}...`).join('\n');
    return `报告 #${reportId} 尚有 ${missingCount} 条题目缺少标注记录，无法完成复核。\n请先补录以下题目的领域标注：\n${samples}\n共 ${missingCount > 5 ? `... 等共 ${missingCount} 条` : ''}`;
}
//# sourceMappingURL=response.js.map