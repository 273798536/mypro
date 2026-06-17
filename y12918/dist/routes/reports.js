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
const express_1 = require("express");
const reportService = __importStar(require("../services/report"));
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const status = req.query.status;
        const result = reportService.listReports(page, pageSize, status);
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, 500);
    }
});
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const report = reportService.getReportById(id);
        if (!report) {
            (0, response_1.errorResponse)(res, '报告不存在', 404);
            return;
        }
        (0, response_1.successResponse)(res, report);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500);
    }
});
router.get('/:id/summary', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const summary = reportService.getReportSummary(id);
        (0, response_1.successResponse)(res, summary);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500);
    }
});
router.post('/', (req, res) => {
    try {
        const { name, evaluation_set_id, vocabulary_id, created_by } = req.body;
        if (!name || !evaluation_set_id || !vocabulary_id) {
            (0, response_1.errorResponse)(res, '报告名称、评测集ID、词表ID都不能为空', 400);
            return;
        }
        const id = reportService.createReport(name, parseInt(evaluation_set_id), parseInt(vocabulary_id), created_by);
        (0, response_1.successResponse)(res, { id }, '创建成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.post('/:id/generate', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        reportService.generateReport(id);
        const report = reportService.getReportById(id);
        (0, response_1.successResponse)(res, report, '报告生成成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.put('/:id/status', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, operator } = req.body;
        if (!status) {
            (0, response_1.errorResponse)(res, '目标状态不能为空', 400);
            return;
        }
        const report = reportService.transitionStatus(id, status, operator);
        (0, response_1.successResponse)(res, report, '状态更新成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.get('/:id/items', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const isCovered = req.query.isCovered !== undefined
            ? parseInt(req.query.isCovered)
            : undefined;
        const annotationStatus = req.query.annotationStatus;
        const reviewed = req.query.reviewed !== undefined
            ? req.query.reviewed === 'true'
            : undefined;
        const result = reportService.listReportItems(id, page, pageSize, {
            isCovered,
            annotationStatus,
            reviewed,
        });
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500);
    }
});
router.put('/:id/items/:itemId/annotation', (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const itemId = parseInt(req.params.itemId);
        const { annotation_status, annotation_note, reviewer } = req.body;
        if (!annotation_status) {
            (0, response_1.errorResponse)(res, '标注状态不能为空', 400);
            return;
        }
        reportService.updateReportItemAnnotation(reportId, itemId, annotation_status, annotation_note, reviewer);
        (0, response_1.successResponse)(res, null, '标注更新成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.post('/:id/items/:itemId/review', (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const itemId = parseInt(req.params.itemId);
        const { action, comment, reviewer, annotation_data } = req.body;
        if (!action || !['confirm', 'reject', 'supplement'].includes(action)) {
            (0, response_1.errorResponse)(res, '操作类型不合法，可选值：confirm、reject、supplement', 400);
            return;
        }
        reportService.reviewReportItem(reportId, itemId, action, comment, reviewer, annotation_data);
        (0, response_1.successResponse)(res, null, '复核成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.get('/:id/review-records', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = reportService.listReviewRecords(id, page, pageSize);
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500);
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map