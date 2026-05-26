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
const report_service_1 = require("../services/report.service");
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
const reportService = new report_service_1.ReportService();
router.get("/business", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const report = await reportService.generateBusinessReport({
            startDate: startDate,
            endDate: endDate,
        });
        res.json({ success: true, data: report });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/business/export", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const report = await reportService.generateBusinessReport({
            startDate: startDate,
            endDate: endDate,
        });
        const exportDir = path.join(process.cwd(), "exports");
        const filePath = await reportService.exportToCSV(report, exportDir);
        res.download(filePath, (err) => {
            if (err) {
                res.status(500).json({ success: false, error: "下载失败" });
            }
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/dead-letter/export", async (req, res) => {
    try {
        const exportDir = path.join(process.cwd(), "exports");
        const filePath = await reportService.exportDeadLetterToCSV(exportDir);
        res.download(filePath, (err) => {
            if (err) {
                res.status(500).json({ success: false, error: "下载失败" });
            }
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/dirty-records/export", async (req, res) => {
    try {
        const exportDir = path.join(process.cwd(), "exports");
        const filePath = await reportService.exportDirtyRecordsToCSV(exportDir);
        res.download(filePath, (err) => {
            if (err) {
                res.status(500).json({ success: false, error: "下载失败" });
            }
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
