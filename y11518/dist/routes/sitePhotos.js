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
const data_source_1 = require("../data-source");
const SitePhoto_1 = require("../entities/SitePhoto");
const WorkOrder_1 = require("../entities/WorkOrder");
const AuditService_1 = require("../services/AuditService");
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
const sitePhotoRepo = data_source_1.AppDataSource.getRepository(SitePhoto_1.SitePhoto);
const workOrderRepo = data_source_1.AppDataSource.getRepository(WorkOrder_1.WorkOrder);
const auditService = new AuditService_1.AuditService();
const uploadDir = path.join(process.cwd(), "uploads", "photos");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
router.get("/", async (req, res) => {
    try {
        const { page = 1, pageSize = 20, workOrderId, photoType } = req.query;
        const where = {};
        if (workOrderId)
            where.workOrderId = workOrderId;
        if (photoType)
            where.photoType = photoType;
        const [data, total] = await sitePhotoRepo.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip: (Number(page) - 1) * Number(pageSize),
            take: Number(pageSize),
        });
        res.json({
            success: true,
            data: {
                list: data,
                total,
                page: Number(page),
                pageSize: Number(pageSize),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const photo = await sitePhotoRepo.findOne({
            where: { id: req.params.id },
        });
        if (!photo) {
            return res
                .status(404)
                .json({ success: false, message: "照片不存在" });
        }
        res.json({ success: true, data: photo });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get("/workorder/:workOrderId", async (req, res) => {
    try {
        const photos = await sitePhotoRepo.find({
            where: { workOrderId: req.params.workOrderId },
            order: { photoType: "ASC", createdAt: "ASC" },
        });
        res.json({ success: true, data: photos });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { workOrderId, ...photoData } = req.body;
        const workOrder = await workOrderRepo.findOne({
            where: { id: workOrderId },
        });
        if (!workOrder) {
            return res
                .status(404)
                .json({ success: false, message: "关联工单不存在" });
        }
        const photo = sitePhotoRepo.create({
            ...photoData,
            workOrderId,
            fileName: photoData.fileName || `photo_${Date.now()}.jpg`,
            filePath: photoData.filePath || `/uploads/photos/photo_${Date.now()}.jpg`,
        });
        photo.rawData = req.body;
        const saved = await sitePhotoRepo.save(photo);
        await auditService.createSnapshot("after_create", "site_photo", saved.id, saved, undefined, {
            operationId,
            operationName: "create_site_photo",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, data: saved, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.post("/batch", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const { workOrderId, photos } = req.body;
        const workOrder = await workOrderRepo.findOne({
            where: { id: workOrderId },
        });
        if (!workOrder) {
            return res
                .status(404)
                .json({ success: false, message: "关联工单不存在" });
        }
        const results = [];
        for (const photoData of photos) {
            const photo = sitePhotoRepo.create({
                ...photoData,
                workOrderId,
                fileName: photoData.fileName || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.jpg`,
                filePath: photoData.filePath || `/uploads/photos/photo_${Date.now()}.jpg`,
            });
            photo.rawData = photoData;
            const saved = await sitePhotoRepo.save(photo);
            results.push(saved);
            await auditService.createSnapshot("after_create", "site_photo", saved.id, saved, undefined, {
                operationId,
                operationName: "batch_create_site_photo",
                operator: req.headers["x-operator"] || "system",
            });
        }
        res.json({
            success: true,
            data: results,
            count: results.length,
            operationId,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.put("/:id", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const photo = await sitePhotoRepo.findOne({
            where: { id: req.params.id },
        });
        if (!photo) {
            return res
                .status(404)
                .json({ success: false, message: "照片不存在" });
        }
        const previousData = { ...photo };
        await auditService.createSnapshot("before_update", "site_photo", photo.id, previousData, undefined, {
            operationId,
            operationName: "update_site_photo",
            operator: req.headers["x-operator"] || "system",
        });
        sitePhotoRepo.merge(photo, req.body);
        photo.rawData = { ...photo.rawData, ...req.body };
        const saved = await sitePhotoRepo.save(photo);
        await auditService.createSnapshot("after_update", "site_photo", saved.id, saved, previousData, {
            operationId,
            operationName: "update_site_photo",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, data: saved, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
router.delete("/:id", async (req, res) => {
    const operationId = (0, uuid_1.v4)();
    try {
        const photo = await sitePhotoRepo.findOne({
            where: { id: req.params.id },
        });
        if (!photo) {
            return res
                .status(404)
                .json({ success: false, message: "照片不存在" });
        }
        await auditService.createSnapshot("before_delete", "site_photo", photo.id, photo, undefined, {
            operationId,
            operationName: "delete_site_photo",
            operator: req.headers["x-operator"] || "system",
        });
        await sitePhotoRepo.remove(photo);
        await auditService.createSnapshot("after_delete", "site_photo", photo.id, { deleted: true, id: photo.id }, photo, {
            operationId,
            operationName: "delete_site_photo",
            operator: req.headers["x-operator"] || "system",
        });
        res.json({ success: true, operationId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.default = router;
