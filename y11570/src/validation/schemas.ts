import * as Joi from 'joi';
import { TicketStatus, AssignmentType, FrozenType, ApprovalStatus } from '../types';

export const sessionSummarySchema = Joi.object({
  customerId: Joi.string().required().trim().min(1).max(100),
  issueType: Joi.string().required().trim().min(1).max(50),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  description: Joi.string().required().trim().min(1).max(2000),
  initialContactTime: Joi.date().required(),
  expectedResolutionTime: Joi.date().required(),
  agentId: Joi.string().trim().max(100).optional()
});

export const slaRuleSchema = Joi.object({
  ticketType: Joi.string().required().trim().min(1).max(50),
  priority: Joi.string().valid('low', 'medium', 'high').required(),
  firstResponseTime: Joi.number().integer().min(1).max(1440).required(),
  resolutionTime: Joi.number().integer().min(1).max(10080).required(),
  escalationThreshold: Joi.number().integer().min(1).max(10).required()
});

export const compensationRuleSchema = Joi.object({
  issueType: Joi.string().required().trim().min(1).max(50),
  baseAmount: Joi.number().min(0).max(100000).required(),
  maxAmount: Joi.number().min(0).max(100000).required(),
  multiplier: Joi.number().min(0.1).max(10).required()
});

export const createTicketSchema = Joi.object({
  sessionSummary: sessionSummarySchema.required(),
  slaRuleId: Joi.string().required().trim().min(1).max(100),
  batchId: Joi.string().trim().max(100).optional(),
  createdBy: Joi.string().required().trim().min(1).max(100)
});

export const reassignTicketSchema = Joi.object({
  toAgentId: Joi.string().required().trim().min(1).max(100),
  assignmentType: Joi.string().valid(...Object.values(AssignmentType)).required(),
  reason: Joi.string().trim().max(1000).optional(),
  operatorId: Joi.string().required().trim().min(1).max(100),
  slaRuleId: Joi.string().trim().max(100).optional()
});

export const compensationRequestSchema = Joi.object({
  requestedAmount: Joi.number().min(0).max(100000).required(),
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const compensationReviewSchema = Joi.object({
  approvalId: Joi.string().required().trim().min(1).max(100),
  approved: Joi.boolean().required(),
  approvedAmount: Joi.number().min(0).max(100000).when('approved', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const freezeTicketSchema = Joi.object({
  frozenType: Joi.string().valid(...Object.values(FrozenType)).required(),
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const unfreezeTicketSchema = Joi.object({
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const settleTicketSchema = Joi.object({
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const archiveTicketSchema = Joi.object({
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const createBatchSchema = Joi.object({
  name: Joi.string().required().trim().min(1).max(200),
  createdBy: Joi.string().required().trim().min(1).max(100)
});

export const addTicketsToBatchSchema = Joi.object({
  tickets: Joi.array().items(createTicketSchema).min(1).max(1000).required(),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const batchOperatorSchema = Joi.object({
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const freezeBatchSchema = Joi.object({
  frozenType: Joi.string().valid(...Object.values(FrozenType)).required(),
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const attachmentSchema = Joi.object({
  fileName: Joi.string().required().trim().min(1).max(255),
  fileType: Joi.string().required().trim().min(1).max(50),
  fileUrl: Joi.string().required().trim().min(1).max(500),
  uploadedBy: Joi.string().required().trim().min(1).max(100)
});

export const inventoryDifferenceSchema = Joi.object({
  ticketId: Joi.string().required().trim().min(1).max(100),
  productId: Joi.string().required().trim().min(1).max(100),
  expectedQuantity: Joi.number().integer().min(0).required(),
  actualQuantity: Joi.number().integer().min(0).required(),
  difference: Joi.number().integer().required(),
  reason: Joi.string().trim().max(1000).optional(),
  operatorId: Joi.string().trim().max(100).optional(),
  createdBy: Joi.string().trim().max(100).optional()
});

export const inventoryDiffReasonSchema = Joi.object({
  reason: Joi.string().required().trim().min(1).max(1000)
});

export const unarchiveTicketSchema = Joi.object({
  reason: Joi.string().required().trim().min(1).max(1000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const exportRequestSchema = Joi.object({
  requestedBy: Joi.string().required().trim().min(1).max(100)
});

export const queryParamsSchema = Joi.object({
  status: Joi.string().valid(...Object.values(TicketStatus)).optional(),
  batchId: Joi.string().trim().max(100).optional(),
  createdBy: Joi.string().trim().max(100).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  productId: Joi.string().trim().max(100).optional(),
  hasDifference: Joi.boolean().optional()
});

export const reviewTicketSchema = Joi.object({
  reviewResult: Joi.string().valid('approved', 'rejected', 'escalated').required(),
  reviewComments: Joi.string().required().trim().min(1).max(2000),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const overrideTicketSchema = Joi.object({
  toStatus: Joi.string().valid(...Object.values(TicketStatus)).required(),
  overrideReason: Joi.string().required().trim().min(1).max(2000),
  newCompensation: Joi.number().min(0).max(100000).optional(),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const reportOptionsSchema = Joi.object({
  includeTicketDetails: Joi.boolean().optional().default(true),
  includeInventory: Joi.boolean().optional().default(true),
  includeTimeouts: Joi.boolean().optional().default(true),
  includeAssignments: Joi.boolean().optional().default(true),
  includeTransitions: Joi.boolean().optional().default(true),
  includeCompensation: Joi.boolean().optional().default(true),
  includeResponsibility: Joi.boolean().optional().default(true),
  requestedBy: Joi.string().required().trim().min(1).max(100),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export const operationsReportSchema = Joi.object({
  startDate: Joi.string().trim().optional(),
  endDate: Joi.string().trim().optional(),
  status: Joi.string().trim().optional(),
  includeTicketDetails: Joi.boolean().optional().default(false),
  requestedBy: Joi.string().required().trim().min(1).max(100),
  operatorId: Joi.string().required().trim().min(1).max(100)
});

export function validateSchema(schema: Joi.ObjectSchema, data: any): { valid: boolean; errors?: string[] } {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    return {
      valid: false,
      errors: error.details.map(d => d.message)
    };
  }
  return { valid: true };
}

export default {
  sessionSummarySchema,
  slaRuleSchema,
  compensationRuleSchema,
  createTicketSchema,
  reassignTicketSchema,
  compensationRequestSchema,
  compensationReviewSchema,
  freezeTicketSchema,
  unfreezeTicketSchema,
  settleTicketSchema,
  archiveTicketSchema,
  createBatchSchema,
  addTicketsToBatchSchema,
  batchOperatorSchema,
  freezeBatchSchema,
  attachmentSchema,
  inventoryDifferenceSchema,
  inventoryDiffReasonSchema,
  exportRequestSchema,
  queryParamsSchema,
  reviewTicketSchema,
  overrideTicketSchema,
  reportOptionsSchema,
  operationsReportSchema,
  validateSchema
};
