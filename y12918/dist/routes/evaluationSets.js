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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sync_1 = require("csv-parse/sync");
const evalSetService = __importStar(require("../services/evaluationSet"));
const response_1 = require("../utils/response");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = evalSetService.listEvaluationSets(page, pageSize);
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, 500);
    }
});
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const item = evalSetService.getEvaluationSetById(id);
        if (!item) {
            (0, response_1.errorResponse)(res, '评测集不存在', 404);
            return;
        }
        (0, response_1.successResponse)(res, item);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, 500);
    }
});
router.post('/', (req, res) => {
    try {
        const { name, description, source } = req.body;
        if (!name) {
            (0, response_1.errorResponse)(res, '评测集名称不能为空', 400);
            return;
        }
        const id = evalSetService.createEvaluationSet(name, description, source);
        (0, response_1.successResponse)(res, { id }, '创建成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.post('/:id/import', upload.single('file'), (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const evalSet = evalSetService.getEvaluationSetById(id);
        if (!evalSet) {
            (0, response_1.errorResponse)(res, '评测集不存在', 404);
            return;
        }
        let rows = [];
        if (req.file) {
            const content = req.file.buffer.toString('utf-8');
            rows = (0, sync_1.parse)(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
        }
        else if (req.body.rows && Array.isArray(req.body.rows)) {
            rows = req.body.rows;
        }
        else {
            (0, response_1.errorResponse)(res, '请上传CSV文件或提供rows数据', 400);
            return;
        }
        const importRows = rows.map((r) => ({
            question_id: r.question_id || r['题目ID'] || r.id,
            question_text: r.question_text || r['题目内容'] || r.text,
            domain_tags: r.domain_tags || r['领域标签'] || r.tags,
            annotation_status: (r.annotation_status || r['标注状态'] || 'none'),
            annotation_note: r.annotation_note || r['标注说明'],
        }));
        const result = evalSetService.importQuestions(id, importRows);
        (0, response_1.successResponse)(res, result, '导入完成');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.get('/:id/questions', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const annotationStatus = req.query.annotationStatus;
        const result = evalSetService.listQuestions(id, page, pageSize, annotationStatus);
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500);
    }
});
router.put('/:id/questions/:questionId/annotation', (req, res) => {
    try {
        const evalSetId = parseInt(req.params.id);
        const questionId = req.params.questionId;
        const { annotation_status, domain_tags, annotation_note } = req.body;
        if (!annotation_status) {
            (0, response_1.errorResponse)(res, '标注状态不能为空', 400);
            return;
        }
        const result = evalSetService.updateQuestionAnnotation(evalSetId, questionId, annotation_status, domain_tags, annotation_note);
        (0, response_1.successResponse)(res, result, '标注更新成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
exports.default = router;
//# sourceMappingURL=evaluationSets.js.map