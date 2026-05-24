"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationService = exports.ValidationService = void 0;
class ValidationService {
    validateTicket(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketNo || typeof data.ticketNo !== 'string') {
            errors.push('ticketNo 是必填字段且必须是字符串');
        }
        if (!data.title || typeof data.title !== 'string') {
            errors.push('title 是必填字段且必须是字符串');
        }
        const validStatuses = ['open', 'in_progress', 'pending', 'resolved', 'closed', 'escalated'];
        if (data.status && !validStatuses.includes(data.status)) {
            errors.push(`status 必须是以下值之一: ${validStatuses.join(', ')}`);
        }
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        if (data.priority && !validPriorities.includes(data.priority)) {
            errors.push(`priority 必须是以下值之一: ${validPriorities.join(', ')}`);
        }
        if (!data.assignee || typeof data.assignee !== 'string') {
            warnings.push('assignee 建议填写');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateSessionSummary(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketId || typeof data.ticketId !== 'string') {
            errors.push('ticketId 是必填字段且必须是字符串');
        }
        if (!data.summary || typeof data.summary !== 'string') {
            errors.push('summary 是必填字段且必须是字符串');
        }
        if (data.keyPoints && !Array.isArray(data.keyPoints)) {
            errors.push('keyPoints 必须是数组');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateSLARule(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketId || typeof data.ticketId !== 'string') {
            errors.push('ticketId 是必填字段且必须是字符串');
        }
        if (!data.ruleName || typeof data.ruleName !== 'string') {
            errors.push('ruleName 是必填字段且必须是字符串');
        }
        if (data.responseTime !== undefined && typeof data.responseTime !== 'number') {
            errors.push('responseTime 必须是数字（分钟）');
        }
        if (data.resolutionTime !== undefined && typeof data.resolutionTime !== 'number') {
            errors.push('resolutionTime 必须是数字（分钟）');
        }
        if (!data.startTime) {
            warnings.push('startTime 建议填写，用于计算SLA超时');
        }
        if (!data.deadline) {
            warnings.push('deadline 建议填写，用于计算SLA超时');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateCompensationApproval(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketId || typeof data.ticketId !== 'string') {
            errors.push('ticketId 是必填字段且必须是字符串');
        }
        if (data.amount === undefined || typeof data.amount !== 'number') {
            errors.push('amount 是必填字段且必须是数字');
        }
        if (data.amount !== undefined && data.amount < 0) {
            errors.push('amount 不能为负数');
        }
        if (!data.reason || typeof data.reason !== 'string') {
            errors.push('reason 是必填字段且必须是字符串');
        }
        const validStatuses = ['pending', 'approved', 'rejected'];
        if (data.status && !validStatuses.includes(data.status)) {
            errors.push(`status 必须是以下值之一: ${validStatuses.join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateCustomerServiceNote(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketId || typeof data.ticketId !== 'string') {
            errors.push('ticketId 是必填字段且必须是字符串');
        }
        if (!data.content || typeof data.content !== 'string') {
            errors.push('content 是必填字段且必须是字符串');
        }
        const validTypes = ['internal', 'customer'];
        if (data.type && !validTypes.includes(data.type)) {
            errors.push(`type 必须是以下值之一: ${validTypes.join(', ')}`);
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateExceptionPhoto(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketId || typeof data.ticketId !== 'string') {
            errors.push('ticketId 是必填字段且必须是字符串');
        }
        if (!data.fileName || typeof data.fileName !== 'string') {
            errors.push('fileName 是必填字段且必须是字符串');
        }
        if (!data.filePath || typeof data.filePath !== 'string') {
            errors.push('filePath 是必填字段且必须是字符串');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    validateAssignmentHistory(data) {
        const errors = [];
        const warnings = [];
        if (!data.ticketId || typeof data.ticketId !== 'string') {
            errors.push('ticketId 是必填字段且必须是字符串');
        }
        if (!data.toAssignee || typeof data.toAssignee !== 'string') {
            errors.push('toAssignee 是必填字段且必须是字符串');
        }
        if (!data.transferredAt) {
            errors.push('transferredAt 是必填字段');
        }
        if (!data.reason || typeof data.reason !== 'string') {
            warnings.push('转派原因建议填写，便于后续追责');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
}
exports.ValidationService = ValidationService;
exports.validationService = new ValidationService();
//# sourceMappingURL=ValidationService.js.map