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
const corridorService = __importStar(require("../services/corridorService"));
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const corridors = await corridorService.getAllCorridors();
        res.json({ success: true, data: corridors });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const corridor = await corridorService.getCorridorById(req.params.id);
        if (!corridor) {
            return res.status(404).json({ success: false, error: 'Corridor not found' });
        }
        res.json({ success: true, data: corridor });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/', async (req, res) => {
    try {
        const corridor = await corridorService.createCorridor(req.body);
        res.status(201).json({ success: true, data: corridor });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const corridor = await corridorService.updateCorridor(req.params.id, req.body);
        if (!corridor) {
            return res.status(404).json({ success: false, error: 'Corridor not found' });
        }
        res.json({ success: true, data: corridor });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await corridorService.deleteCorridor(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Corridor not found' });
        }
        res.json({ success: true, message: 'Corridor deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
