import { Response, NextFunction } from 'express';
import { UserRole } from '../entities';
import { AuthenticatedRequest } from './auth.middleware';

const fieldVisibility: Record<UserRole, Record<string, string[]>> = {
  [UserRole.DATA_ENTRY]: {
    declaration: ['id', 'declarationNo', 'packageNo', 'senderName', 'senderAddress', 'receiverName', 'receiverAddress', 'declaredValue', 'currency', 'weight', 'itemDescription', 'hsCode', 'hasAttachment', 'status', 'enteredBy', 'createdAt', 'updatedAt'],
    trajectory: ['id', 'declarationId', 'nodeType', 'nodeName', 'status', 'occurredAt', 'location', 'description', 'operator', 'isAbnormal', 'abnormalReason'],
    tax: ['id', 'noticeNo', 'packageNo', 'taxAmount', 'taxCategory', 'issueDate', 'dueDate', 'status'],
    comment: [],
    badData: ['id', 'errorType', 'sourceType', 'errorMessage', 'createdAt']
  },
  [UserRole.REVIEWER]: {
    declaration: ['id', 'declarationNo', 'packageNo', 'senderName', 'senderAddress', 'receiverName', 'receiverAddress', 'declaredValue', 'currency', 'weight', 'itemDescription', 'hsCode', 'hasAttachment', 'attachmentUrl', 'status', 'enteredBy', 'reviewedBy', 'reviewNotes', 'tags', 'createdAt', 'updatedAt'],
    trajectory: ['id', 'declarationId', 'nodeType', 'nodeName', 'status', 'occurredAt', 'location', 'description', 'operator', 'metadata', 'isAbnormal', 'abnormalReason', 'parentPackageNo', 'splitFromNodeId'],
    tax: ['id', 'noticeNo', 'declarationId', 'packageNo', 'taxAmount', 'vatAmount', 'dutyAmount', 'lateFee', 'taxCategory', 'issueDate', 'dueDate', 'paymentDate', 'status', 'paymentReference', 'disputeReason', 'disputedBy', 'isSplitTax'],
    comment: ['id', 'declarationId', 'supervisorName', 'decision', 'comment', 'createdAt'],
    badData: ['id', 'errorType', 'status', 'sourceType', 'rawData', 'errorMessage', 'errorDetails', 'sourceFile', 'sourceRow', 'reportedBy', 'createdAt'],
    reconciliation: ['id', 'declarationId', 'packageNo', 'status', 'mismatchTypes', 'mismatchDetails', 'expectedTaxAmount', 'actualTaxAmount', 'taxDifference', 'hasSplitPackages', 'relatedPackageNos', 'batchNo', 'createdAt']
  },
  [UserRole.SUPERVISOR]: {
    declaration: ['*'],
    trajectory: ['*'],
    tax: ['*'],
    comment: ['*'],
    badData: ['*'],
    reconciliation: ['*'],
    user: ['id', 'username', 'name', 'role', 'isActive', 'createdAt']
  },
  [UserRole.READ_ONLY]: {
    declaration: ['id', 'declarationNo', 'packageNo', 'itemDescription', 'hsCode', 'status', 'createdAt'],
    trajectory: ['id', 'declarationId', 'nodeType', 'nodeName', 'status', 'occurredAt', 'isAbnormal'],
    tax: ['id', 'noticeNo', 'packageNo', 'taxAmount', 'status', 'issueDate'],
    comment: ['id', 'declarationId', 'supervisorName', 'decision', 'comment', 'createdAt'],
    badData: ['id', 'errorType', 'status', 'sourceType', 'errorMessage', 'createdAt'],
    reconciliation: ['id', 'declarationId', 'packageNo', 'status', 'mismatchTypes', 'createdAt']
  }
};

const filterObject = (obj: any, allowedFields: string[]): any => {
  if (allowedFields.includes('*')) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => filterObject(item, allowedFields));
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const result: Record<string, any> = {};
  for (const field of allowedFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
};

export const filterFields = (entityType: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json;
    const userRole = req.user?.role || UserRole.READ_ONLY;
    
    res.json = function(body: any): Response {
      const fields = fieldVisibility[userRole]?.[entityType] || fieldVisibility[UserRole.READ_ONLY][entityType] || [];
      const filteredBody = filterObject(body, fields);
      return originalJson.call(this, filteredBody);
    };
    
    next();
  };
};

export const getFilteredFields = (role: UserRole, entityType: string): string[] => {
  return fieldVisibility[role]?.[entityType] || fieldVisibility[UserRole.READ_ONLY][entityType] || [];
};
