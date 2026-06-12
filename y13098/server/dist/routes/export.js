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
const exportService = __importStar(require("../services/exportService"));
const importService = __importStar(require("../services/importService"));
const userService = __importStar(require("../services/userService"));
const utils_1 = require("@shared/utils");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
function parseFilterFromQuery(req) {
    return (0, utils_1.searchParamsToFilterCriteria)(new URLSearchParams(req.query));
}
router.get('/excel', async (req, res) => {
    try {
        const filter = parseFilterFromQuery(req);
        const buffer = await exportService.exportToExcel(filter);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="inspection_records.xlsx"');
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/csv', async (req, res) => {
    try {
        const filter = parseFilterFromQuery(req);
        const csv = await exportService.exportToCSV(filter);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="inspection_records.csv"');
        res.send('\uFEFF' + csv);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/pdf/:recordId', async (req, res) => {
    try {
        const { annotation } = req.query;
        const buffer = await exportService.exportRecordToPDF(req.params.recordId, annotation);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="record_${req.params.recordId}.pdf"`);
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/screenshot', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const screenshot = await exportService.saveScreenshotExport(req.body, user.id);
        res.status(201).json({ success: true, data: screenshot });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/screenshots', async (req, res) => {
    try {
        const { recordId } = req.query;
        const screenshots = await exportService.getScreenshotExports(recordId);
        res.json({ success: true, data: screenshots });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/import/excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const user = await userService.getCurrentUser();
        const result = await importService.importFromExcel(req.file.buffer, user.id);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/import/csv', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const user = await userService.getCurrentUser();
        const content = req.file.buffer.toString('utf-8');
        const result = await importService.importFromCSV(content, user.id);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
