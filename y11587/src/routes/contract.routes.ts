import { Router, Request, Response } from "express";
import { ContractService } from "../services/contract.service";
import { AppDataSource } from "../data-source";
import { ExceptionPhoto } from "../entities/ExceptionPhoto";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";

const router = Router();
const contractService = new ContractService();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "contracts");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `contract-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `photo-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const photoUpload = multer({ storage: photoStorage });

router.post("/", async (req: Request, res: Response) => {
  try {
    const contract = await contractService.createContract(
      req.body,
      req.headers["x-operator"] as string
    );
    res.json({ success: true, data: contract });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const contract = await contractService.getContract(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: "合同不存在" });
    }
    res.json({ success: true, data: contract });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/no/:contractNo", async (req: Request, res: Response) => {
  try {
    const contract = await contractService.getContractByNo(req.params.contractNo);
    if (!contract) {
      return res.status(404).json({ success: false, error: "合同不存在" });
    }
    res.json({ success: true, data: contract });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { changeReason, ...updates } = req.body;
    const contract = await contractService.updateContract(
      req.params.id,
      updates,
      changeReason || "更新合同信息",
      req.headers["x-operator"] as string
    );
    res.json({ success: true, data: contract });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id/export", async (req: Request, res: Response) => {
  try {
    const exportData = await contractService.exportContractData(req.params.id);
    res.json({ success: true, data: exportData });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id/history", async (req: Request, res: Response) => {
  try {
    const history = await contractService.getContractHistory(req.params.id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/payment-nodes", async (req: Request, res: Response) => {
  try {
    const node = await contractService.addPaymentNode(
      req.params.id,
      req.body,
      req.headers["x-operator"] as string
    );
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id/payment-nodes", async (req: Request, res: Response) => {
  try {
    const nodes = await contractService.getPaymentNodes(req.params.id);
    res.json({ success: true, data: nodes });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put("/payment-nodes/:nodeId", async (req: Request, res: Response) => {
  try {
    const { changeReason, ...updates } = req.body;
    const node = await contractService.updatePaymentNode(
      req.params.nodeId,
      updates,
      changeReason || "更新付款节点",
      req.headers["x-operator"] as string
    );
    res.json({ success: true, data: node });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/payment-nodes/:nodeId/history", async (req: Request, res: Response) => {
  try {
    const history = await contractService.getPaymentNodeHistory(req.params.nodeId);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post("/:id/upload-pdf", upload.single("pdf"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "未上传文件" });
    }
    const contract = await contractService.updateContract(
      req.params.id,
      {
        pdfPath: req.file.path,
      },
      "上传合同PDF",
      req.headers["x-operator"] as string
    );
    res.json({
      success: true,
      data: { contract, filePath: req.file.path },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

const photoRepo = AppDataSource.getRepository(ExceptionPhoto);

router.post("/:id/photos", photoUpload.single("photo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "未上传照片" });
    }
    const { category, description, location, takenAt, paymentNodeId, retryQueueId, receiptId } = req.body;
    const photo: any = {
      contractId: req.params.id,
      paymentNodeId,
      retryQueueId,
      receiptId,
      category: category || "OTHER",
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description,
      location,
      takenAt,
      uploadedBy: req.headers["x-operator"] as string || "system",
    };
    const saved = await photoRepo.save(photo);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/:id/photos", async (req: Request, res: Response) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const where: any = { contractId: req.params.id, isDeleted: false };
    if (category) where.category = category;

    const [items, total] = await photoRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    res.json({
      success: true,
      data: { items, total, page: Number(page), limit: Number(limit) },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get("/photos/:photoId", async (req: Request, res: Response) => {
  try {
    const photo = await photoRepo.findOneBy({ id: req.params.photoId, isDeleted: false });
    if (!photo) {
      return res.status(404).json({ success: false, error: "照片不存在" });
    }
    res.json({ success: true, data: photo });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete("/photos/:photoId", async (req: Request, res: Response) => {
  try {
    const photo = await photoRepo.findOneBy({ id: req.params.photoId, isDeleted: false });
    if (!photo) {
      return res.status(404).json({ success: false, error: "照片不存在" });
    }
    photo.isDeleted = true;
    await photoRepo.save(photo);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
