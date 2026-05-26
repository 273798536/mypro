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
const contract_service_1 = require("../services/contract.service");
const multer_1 = __importDefault(require("multer"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const router = (0, express_1.Router)();
const contractService = new contract_service_1.ContractService();
const storage = multer_1.default.diskStorage({
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
const upload = (0, multer_1.default)({ storage });
router.post("/", async (req, res) => {
    try {
        const contract = await contractService.createContract(req.body, req.headers["x-operator"]);
        res.json({ success: true, data: contract });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const contract = await contractService.getContract(req.params.id);
        if (!contract) {
            return res.status(404).json({ success: false, error: "合同不存在" });
        }
        res.json({ success: true, data: contract });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/no/:contractNo", async (req, res) => {
    try {
        const contract = await contractService.getContractByNo(req.params.contractNo);
        if (!contract) {
            return res.status(404).json({ success: false, error: "合同不存在" });
        }
        res.json({ success: true, data: contract });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.put("/:id", async (req, res) => {
    try {
        const { changeReason, ...updates } = req.body;
        const contract = await contractService.updateContract(req.params.id, updates, changeReason || "更新合同信息", req.headers["x-operator"]);
        res.json({ success: true, data: contract });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id/export", async (req, res) => {
    try {
        const exportData = await contractService.exportContractData(req.params.id);
        res.json({ success: true, data: exportData });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id/history", async (req, res) => {
    try {
        const history = await contractService.getContractHistory(req.params.id);
        res.json({ success: true, data: history });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/payment-nodes", async (req, res) => {
    try {
        const node = await contractService.addPaymentNode(req.params.id, req.body, req.headers["x-operator"]);
        res.json({ success: true, data: node });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/:id/payment-nodes", async (req, res) => {
    try {
        const nodes = await contractService.getPaymentNodes(req.params.id);
        res.json({ success: true, data: nodes });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.put("/payment-nodes/:nodeId", async (req, res) => {
    try {
        const { changeReason, ...updates } = req.body;
        const node = await contractService.updatePaymentNode(req.params.nodeId, updates, changeReason || "更新付款节点", req.headers["x-operator"]);
        res.json({ success: true, data: node });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.get("/payment-nodes/:nodeId/history", async (req, res) => {
    try {
        const history = await contractService.getPaymentNodeHistory(req.params.nodeId);
        res.json({ success: true, data: history });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
router.post("/:id/upload-pdf", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "未上传文件" });
        }
        const contract = await contractService.updateContract(req.params.id, {
            pdfPath: req.file.path,
        }, "上传合同PDF", req.headers["x-operator"]);
        res.json({
            success: true,
            data: { contract, filePath: req.file.path },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});
exports.default = router;
