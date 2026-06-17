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
const exportService = __importStar(require("../services/export"));
const report_1 = require("../services/report");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const format = req.query.format || 'csv';
        if (format === 'json') {
            const content = exportService.exportReportToJson(id);
            const fileName = exportService.getExportFileName(id, 'json');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send(content);
        }
        else {
            const content = exportService.exportReportToCSV(id);
            const fileName = exportService.getExportFileName(id, 'csv');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
            res.send('\uFEFF' + content);
        }
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 500, e.details);
    }
});
router.post('/:id/confirm-export', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        (0, report_1.markAsExported)(id);
        res.json({
            code: 0,
            message: '导出确认成功，报告状态已更新为已导出',
        });
    }
    catch (e) {
        (0, response_1.errorResponse)(res, e.message, e.statusCode || 400, e.details);
    }
});
exports.default = router;
//# sourceMappingURL=export.js.map