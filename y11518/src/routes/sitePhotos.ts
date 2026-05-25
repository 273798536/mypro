import { Router, Request, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { SitePhoto } from "../entities/SitePhoto";
import { WorkOrder } from "../entities/WorkOrder";
import { AuditService } from "../services/AuditService";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

const router = Router();
const sitePhotoRepo: Repository<SitePhoto> = AppDataSource.getRepository(SitePhoto);
const workOrderRepo: Repository<WorkOrder> = AppDataSource.getRepository(WorkOrder);
const auditService = new AuditService();

const uploadDir = path.join(process.cwd(), "uploads", "photos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, workOrderId, photoType } = req.query;
    const where: any = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (photoType) where.photoType = photoType;

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/workorder/:workOrderId", async (req: Request, res: Response) => {
  try {
    const photos = await sitePhotoRepo.find({
      where: { workOrderId: req.params.workOrderId },
      order: { photoType: "ASC", createdAt: "ASC" },
    });

    res.json({ success: true, data: photos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const operationId = uuidv4();
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
    }) as any;
    photo.rawData = req.body;

    const saved = await sitePhotoRepo.save(photo);

    await auditService.createSnapshot(
      "after_create",
      "site_photo",
      saved.id,
      saved,
      undefined,
      {
        operationId,
        operationName: "create_site_photo",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    res.json({ success: true, data: saved, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/batch", async (req: Request, res: Response) => {
  const operationId = uuidv4();
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

    const results: any[] = [];
    for (const photoData of photos) {
      const photo = sitePhotoRepo.create({
        ...photoData,
        workOrderId,
        fileName: photoData.fileName || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}.jpg`,
        filePath: photoData.filePath || `/uploads/photos/photo_${Date.now()}.jpg`,
      }) as any;
      photo.rawData = photoData;
      const saved = await sitePhotoRepo.save(photo);
      results.push(saved);

      await auditService.createSnapshot(
        "after_create",
        "site_photo",
        saved.id,
        saved,
        undefined,
        {
          operationId,
          operationName: "batch_create_site_photo",
          operator: (req.headers["x-operator"] as string) || "system",
        }
      );
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      operationId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const operationId = uuidv4();
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

    await auditService.createSnapshot(
      "before_update",
      "site_photo",
      photo.id,
      previousData,
      undefined,
      {
        operationId,
        operationName: "update_site_photo",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    sitePhotoRepo.merge(photo as any, req.body);
    (photo as any).rawData = { ...(photo as any).rawData, ...req.body };
    const saved = await sitePhotoRepo.save(photo as any);

    await auditService.createSnapshot(
      "after_update",
      "site_photo",
      saved.id,
      saved,
      previousData,
      {
        operationId,
        operationName: "update_site_photo",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    res.json({ success: true, data: saved, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const photo = await sitePhotoRepo.findOne({
      where: { id: req.params.id },
    });

    if (!photo) {
      return res
        .status(404)
        .json({ success: false, message: "照片不存在" });
    }

    await auditService.createSnapshot(
      "before_delete",
      "site_photo",
      photo.id,
      photo,
      undefined,
      {
        operationId,
        operationName: "delete_site_photo",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    await sitePhotoRepo.remove(photo);

    await auditService.createSnapshot(
      "after_delete",
      "site_photo",
      photo.id,
      { deleted: true, id: photo.id },
      photo,
      {
        operationId,
        operationName: "delete_site_photo",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    res.json({ success: true, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
