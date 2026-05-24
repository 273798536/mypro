import { ValidationResult } from '../types';
export declare class ValidationService {
    validateTicket(data: Record<string, unknown>): ValidationResult;
    validateSessionSummary(data: Record<string, unknown>): ValidationResult;
    validateSLARule(data: Record<string, unknown>): ValidationResult;
    validateCompensationApproval(data: Record<string, unknown>): ValidationResult;
    validateCustomerServiceNote(data: Record<string, unknown>): ValidationResult;
    validateExceptionPhoto(data: Record<string, unknown>): ValidationResult;
    validateAssignmentHistory(data: Record<string, unknown>): ValidationResult;
}
export declare const validationService: ValidationService;
