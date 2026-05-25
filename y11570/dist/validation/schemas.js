"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryParamsSchema = exports.exportRequestSchema = exports.inventoryDiffReasonSchema = exports.inventoryDifferenceSchema = exports.attachmentSchema = exports.freezeBatchSchema = exports.batchOperatorSchema = exports.addTicketsToBatchSchema = exports.createBatchSchema = exports.archiveTicketSchema = exports.settleTicketSchema = exports.unfreezeTicketSchema = exports.freezeTicketSchema = exports.compensationReviewSchema = exports.compensationRequestSchema = exports.reassignTicketSchema = exports.createTicketSchema = exports.compensationRuleSchema = exports.slaRuleSchema = exports.sessionSummarySchema = void 0;
exports.validateSchema = validateSchema;
const Joi = __importStar(require("joi"));
const types_1 = require("../types");
exports.sessionSummarySchema = Joi.object({
    customerId: Joi.string().required().trim().min(1).max(100),
    issueType: Joi.string().required().trim().min(1).max(50),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    description: Joi.string().required().trim().min(1).max(2000),
    initialContactTime: Joi.date().required(),
    expectedResolutionTime: Joi.date().required(),
    agentId: Joi.string().trim().max(100).optional()
});
exports.slaRuleSchema = Joi.object({
    ticketType: Joi.string().required().trim().min(1).max(50),
    priority: Joi.string().valid('low', 'medium', 'high').required(),
    firstResponseTime: Joi.number().integer().min(1).max(1440).required(),
    resolutionTime: Joi.number().integer().min(1).max(10080).required(),
    escalationThreshold: Joi.number().integer().min(1).max(10).required()
});
exports.compensationRuleSchema = Joi.object({
    issueType: Joi.string().required().trim().min(1).max(50),
    baseAmount: Joi.number().min(0).max(100000).required(),
    maxAmount: Joi.number().min(0).max(100000).required(),
    multiplier: Joi.number().min(0.1).max(10).required()
});
exports.createTicketSchema = Joi.object({
    sessionSummary: exports.sessionSummarySchema.required(),
    slaRuleId: Joi.string().required().trim().min(1).max(100),
    batchId: Joi.string().trim().max(100).optional(),
    createdBy: Joi.string().required().trim().min(1).max(100)
});
exports.reassignTicketSchema = Joi.object({
    ticketId: Joi.string().required().trim().min(1).max(100),
    toAgentId: Joi.string().required().trim().min(1).max(100),
    assignmentType: Joi.string().valid(...Object.values(types_1.AssignmentType)).required(),
    reason: Joi.string().trim().max(1000).optional(),
    operatorId: Joi.string().required().trim().min(1).max(100),
    slaRuleId: Joi.string().trim().max(100).optional()
});
exports.compensationRequestSchema = Joi.object({
    requestedAmount: Joi.number().min(0).max(100000).required(),
    reason: Joi.string().required().trim().min(1).max(1000),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.compensationReviewSchema = Joi.object({
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
exports.freezeTicketSchema = Joi.object({
    frozenType: Joi.string().valid(...Object.values(types_1.FrozenType)).required(),
    reason: Joi.string().required().trim().min(1).max(1000),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.unfreezeTicketSchema = Joi.object({
    reason: Joi.string().required().trim().min(1).max(1000),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.settleTicketSchema = Joi.object({
    reason: Joi.string().required().trim().min(1).max(1000),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.archiveTicketSchema = Joi.object({
    reason: Joi.string().required().trim().min(1).max(1000),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.createBatchSchema = Joi.object({
    name: Joi.string().required().trim().min(1).max(200),
    createdBy: Joi.string().required().trim().min(1).max(100)
});
exports.addTicketsToBatchSchema = Joi.object({
    tickets: Joi.array().items(exports.createTicketSchema).min(1).max(1000).required(),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.batchOperatorSchema = Joi.object({
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.freezeBatchSchema = Joi.object({
    frozenType: Joi.string().valid(...Object.values(types_1.FrozenType)).required(),
    reason: Joi.string().required().trim().min(1).max(1000),
    operatorId: Joi.string().required().trim().min(1).max(100)
});
exports.attachmentSchema = Joi.object({
    fileName: Joi.string().required().trim().min(1).max(255),
    fileType: Joi.string().required().trim().min(1).max(50),
    fileUrl: Joi.string().required().trim().min(1).max(500),
    uploadedBy: Joi.string().required().trim().min(1).max(100)
});
exports.inventoryDifferenceSchema = Joi.object({
    ticketId: Joi.string().required().trim().min(1).max(100),
    productId: Joi.string().required().trim().min(1).max(100),
    expectedQuantity: Joi.number().integer().min(0).required(),
    actualQuantity: Joi.number().integer().min(0).required(),
    difference: Joi.number().integer().required(),
    reason: Joi.string().trim().max(1000).optional(),
    operatorId: Joi.string().trim().max(100).optional(),
    createdBy: Joi.string().trim().max(100).optional()
});
exports.inventoryDiffReasonSchema = Joi.object({
    reason: Joi.string().required().trim().min(1).max(1000)
});
exports.exportRequestSchema = Joi.object({
    requestedBy: Joi.string().required().trim().min(1).max(100)
});
exports.queryParamsSchema = Joi.object({
    status: Joi.string().valid(...Object.values(types_1.TicketStatus)).optional(),
    batchId: Joi.string().trim().max(100).optional(),
    createdBy: Joi.string().trim().max(100).optional(),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    offset: Joi.number().integer().min(0).default(0),
    productId: Joi.string().trim().max(100).optional(),
    hasDifference: Joi.boolean().optional()
});
function validateSchema(schema, data) {
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
        return {
            valid: false,
            errors: error.details.map(d => d.message)
        };
    }
    return { valid: true };
}
exports.default = {
    sessionSummarySchema: exports.sessionSummarySchema,
    slaRuleSchema: exports.slaRuleSchema,
    compensationRuleSchema: exports.compensationRuleSchema,
    createTicketSchema: exports.createTicketSchema,
    reassignTicketSchema: exports.reassignTicketSchema,
    compensationRequestSchema: exports.compensationRequestSchema,
    compensationReviewSchema: exports.compensationReviewSchema,
    freezeTicketSchema: exports.freezeTicketSchema,
    unfreezeTicketSchema: exports.unfreezeTicketSchema,
    settleTicketSchema: exports.settleTicketSchema,
    archiveTicketSchema: exports.archiveTicketSchema,
    createBatchSchema: exports.createBatchSchema,
    addTicketsToBatchSchema: exports.addTicketsToBatchSchema,
    batchOperatorSchema: exports.batchOperatorSchema,
    freezeBatchSchema: exports.freezeBatchSchema,
    attachmentSchema: exports.attachmentSchema,
    inventoryDifferenceSchema: exports.inventoryDifferenceSchema,
    inventoryDiffReasonSchema: exports.inventoryDiffReasonSchema,
    exportRequestSchema: exports.exportRequestSchema,
    queryParamsSchema: exports.queryParamsSchema,
    validateSchema
};
//# sourceMappingURL=schemas.js.map