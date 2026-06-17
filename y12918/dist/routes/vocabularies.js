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
const vocabService = __importStar(require("../services/vocabulary"));
const response_1 = require("../utils/response");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.get('/', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = vocabService.listVocabularies(page, pageSize);
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, 500);
    }
});
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const item = vocabService.getVocabularyById(id);
        if (!item) {
            (0, response_1.errorResponse)(res, '领域词表不存在', 404);
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
        const { name, domain } = req.body;
        if (!name || !domain) {
            (0, response_1.errorResponse)(res, '词表名称和领域都不能为空', 400);
            return;
        }
        const id = vocabService.createVocabulary(name, domain);
        (0, response_1.successResponse)(res, { id }, '创建成功');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.post('/:id/import', upload.single('file'), (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const vocab = vocabService.getVocabularyById(id);
        if (!vocab) {
            (0, response_1.errorResponse)(res, '领域词表不存在', 404);
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
            term: r.term || r['词条'] || r.word,
            category: r.category || r['分类'] || r.type,
        }));
        const result = vocabService.importVocabTerms(id, importRows);
        (0, response_1.successResponse)(res, result, '导入完成');
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
router.get('/:id/terms', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 50;
        const category = req.query.category;
        const result = vocabService.listVocabTerms(id, page, pageSize, category);
        (0, response_1.successResponse)(res, result);
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500);
    }
});
exports.default = router;
//# sourceMappingURL=vocabularies.js.map