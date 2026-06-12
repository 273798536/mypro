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
const recordService = __importStar(require("../services/recordService"));
const materialService = __importStar(require("../services/materialService"));
const noteService = __importStar(require("../services/noteService"));
const historyService = __importStar(require("../services/historyService"));
const userService = __importStar(require("../services/userService"));
const utils_1 = require("@shared/utils");
const router = (0, express_1.Router)();
function parseFilterFromQuery(req) {
    return (0, utils_1.searchParamsToFilterCriteria)(new URLSearchParams(req.query));
}
router.get('/', async (req, res) => {
    try {
        const filter = parseFilterFromQuery(req);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = await recordService.getRecords(filter, page, pageSize);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/overlapping', async (req, res) => {
    try {
        const filter = parseFilterFromQuery(req);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = await recordService.getOverlappingRecords(filter, page, pageSize);
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const record = await recordService.getRecordById(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.json({ success: true, data: record });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:id/details', async (req, res) => {
    try {
        const details = await recordService.getRecordDetails(req.params.id);
        if (!details) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.json({ success: true, data: details });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const record = await recordService.createRecord(req.body, user.id);
        res.status(201).json({ success: true, data: record });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const record = await recordService.updateRecord(req.params.id, req.body, user.id);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.json({ success: true, data: record });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:id/confirm', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const { remark } = req.body;
        const record = await recordService.confirmRecord(req.params.id, user.id, remark);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.json({ success: true, data: record });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:id/reject', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const { remark } = req.body;
        const record = await recordService.rejectRecord(req.params.id, user.id, remark);
        if (!record) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.json({ success: true, data: record });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await recordService.deleteRecord(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.json({ success: true, message: 'Record deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:id/materials', async (req, res) => {
    try {
        const materials = await materialService.getMaterialsByRecordId(req.params.id);
        res.json({ success: true, data: materials });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:id/materials', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const material = await materialService.createMaterial({
            ...req.body,
            recordId: req.params.id
        }, user.id);
        res.status(201).json({ success: true, data: material });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:id/notes', async (req, res) => {
    try {
        const notes = await noteService.getNotesByRecordId(req.params.id);
        res.json({ success: true, data: notes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:id/notes', async (req, res) => {
    try {
        const user = await userService.getCurrentUser();
        const note = await noteService.createNote({
            ...req.body,
            recordId: req.params.id
        }, user.id);
        res.status(201).json({ success: true, data: note });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:id/history', async (req, res) => {
    try {
        const history = await historyService.getHistoryByRecordId(req.params.id);
        res.json({ success: true, data: history });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
