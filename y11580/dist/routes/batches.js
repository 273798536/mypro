"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchesRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const config_1 = require("../config");
const stateMachine_1 = require("../services/stateMachine");
const dataValidator_1 = require("../services/dataValidator");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
exports.batchesRouter = router;
router.use(auth_1.authMiddleware);
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = (0, multer_1.default)({ storage });
function generateBatchNo(recordType) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${recordType.toUpperCase()}-${date}-${random}`;
}
router.post('/', (0, auth_1.requirePermission)('batch:create'), async (req, res) => {
    try {
        const { idempotencyKey, title, recordType, storeId, batchDate, records } = req.body;
        const user = req.user;
        const existing = await prisma_1.prisma.batch.findUnique({ where: { idempotencyKey } });
        if (existing) {
            return res.json({
                id: existing.id,
                batchNo: existing.batchNo,
                status: existing.status,
                isNew: false,
                message: '幂等命中，返回已存在批次'
            });
        }
        const parsedBatchDate = batchDate ? new Date(batchDate) : new Date();
        const processedMemberRecords = new Map();
        const batch = await prisma_1.prisma.$transaction(async (tx) => {
            const newBatch = await tx.batch.create({
                data: {
                    idempotencyKey,
                    batchNo: generateBatchNo(recordType),
                    title,
                    recordType,
                    storeId,
                    createdBy: user.id
                }
            });
            if (records && records.length > 0) {
                for (const recordData of records) {
                    const recordIdempotencyKey = recordData.idempotencyKey || `${idempotencyKey}-${recordData.memberId || recordData.phone || Math.random()}`;
                    const existingDbRecord = await tx.record.findFirst({
                        where: {
                            storeId,
                            memberId: recordData.memberId,
                            status: { in: [config_1.CONFIG.RECORD_STATUS.VALID, config_1.CONFIG.RECORD_STATUS.REVIEWED, config_1.CONFIG.RECORD_STATUS.RESOLVED] }
                        },
                        orderBy: { createdAt: 'desc' }
                    });
                    const validationContext = {
                        batchDate: parsedBatchDate
                    };
                    const inBatchRecord = recordData.memberId ? processedMemberRecords.get(recordData.memberId) : undefined;
                    let existingRecord;
                    if (existingDbRecord) {
                        existingRecord = {
                            memberName: existingDbRecord.memberName || undefined,
                            amount: parseFloat(existingDbRecord.amount.toString()),
                            quantity: existingDbRecord.quantity ?? undefined
                        };
                    }
                    else if (inBatchRecord) {
                        existingRecord = inBatchRecord;
                    }
                    if (existingRecord) {
                        validationContext.existingRecord = existingRecord;
                    }
                    const validation = (0, dataValidator_1.validateRecord)({
                        ...recordData,
                        recordType,
                        storeId,
                        transactionDate: recordData.transactionDate ? new Date(recordData.transactionDate) : undefined
                    }, validationContext);
                    const status = validation.isValid ? config_1.CONFIG.RECORD_STATUS.VALID : config_1.CONFIG.RECORD_STATUS.DIRTY;
                    await tx.record.create({
                        data: {
                            idempotencyKey: recordIdempotencyKey,
                            batchId: newBatch.id,
                            recordType,
                            storeId,
                            memberId: recordData.memberId,
                            memberName: recordData.memberName,
                            phone: recordData.phone,
                            amount: recordData.amount,
                            quantity: recordData.quantity,
                            transactionDate: recordData.transactionDate ? new Date(recordData.transactionDate) : null,
                            operator: recordData.operator,
                            originalContent: (0, dataValidator_1.serializeJson)(recordData),
                            rawData: (0, dataValidator_1.serializeJson)(recordData),
                            source: recordData.source || 'api',
                            status,
                            dirtyType: validation.dirtyType,
                            dirtyRemark: validation.dirtyRemark,
                            createdBy: user.id
                        }
                    });
                    if (recordData.memberId && status === config_1.CONFIG.RECORD_STATUS.VALID && !inBatchRecord) {
                        processedMemberRecords.set(recordData.memberId, {
                            memberName: recordData.memberName,
                            amount: recordData.amount,
                            quantity: recordData.quantity
                        });
                    }
                }
            }
            return newBatch;
        });
        await (0, stateMachine_1.recalculateBatchStats)(batch.id);
        const updated = await prisma_1.prisma.batch.findUnique({ where: { id: batch.id } });
        res.status(201).json({
            ...(0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'),
            isNew: true
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/records', (0, auth_1.requirePermission)('record:create'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const { records, batchDate } = req.body;
        const user = req.user;
        const batch = await prisma_1.prisma.batch.findUnique({ where: { id: batchId } });
        if (!batch)
            return res.status(404).json({ error: '批次不存在' });
        if (batch.status !== config_1.CONFIG.BATCH_STATUS.DRAFT) {
            return res.status(400).json({ error: '只能在草稿状态添加记录' });
        }
        const parsedBatchDate = batchDate ? new Date(batchDate) : new Date();
        const processedMemberRecords = new Map();
        const results = [];
        for (const recordData of records) {
            const recordIdempotencyKey = recordData.idempotencyKey || `${batchId}-${recordData.memberId || recordData.phone || (0, uuid_1.v4)()}`;
            const existing = await prisma_1.prisma.record.findUnique({ where: { idempotencyKey: recordIdempotencyKey } });
            if (existing) {
                results.push({ id: existing.id, isNew: false, message: '幂等命中，记录已存在' });
                continue;
            }
            const existingMemberRecord = await prisma_1.prisma.record.findFirst({
                where: {
                    storeId: batch.storeId,
                    memberId: recordData.memberId,
                    status: { in: [config_1.CONFIG.RECORD_STATUS.VALID, config_1.CONFIG.RECORD_STATUS.REVIEWED, config_1.CONFIG.RECORD_STATUS.RESOLVED] }
                },
                orderBy: { createdAt: 'desc' }
            });
            const validationContext = {
                batchDate: parsedBatchDate
            };
            const inBatchRecord = recordData.memberId ? processedMemberRecords.get(recordData.memberId) : undefined;
            let existingRecord;
            if (existingMemberRecord) {
                existingRecord = {
                    memberName: existingMemberRecord.memberName || undefined,
                    amount: parseFloat(existingMemberRecord.amount.toString()),
                    quantity: existingMemberRecord.quantity ?? undefined
                };
            }
            else if (inBatchRecord) {
                existingRecord = inBatchRecord;
            }
            if (existingRecord) {
                validationContext.existingRecord = existingRecord;
            }
            const validation = (0, dataValidator_1.validateRecord)({
                ...recordData,
                recordType: batch.recordType,
                storeId: batch.storeId,
                transactionDate: recordData.transactionDate ? new Date(recordData.transactionDate) : undefined
            }, validationContext);
            const status = validation.isValid ? config_1.CONFIG.RECORD_STATUS.VALID : config_1.CONFIG.RECORD_STATUS.DIRTY;
            const record = await prisma_1.prisma.record.create({
                data: {
                    idempotencyKey: recordIdempotencyKey,
                    batchId,
                    recordType: batch.recordType,
                    storeId: batch.storeId,
                    memberId: recordData.memberId,
                    memberName: recordData.memberName,
                    phone: recordData.phone,
                    amount: recordData.amount,
                    quantity: recordData.quantity,
                    transactionDate: recordData.transactionDate ? new Date(recordData.transactionDate) : null,
                    operator: recordData.operator,
                    originalContent: (0, dataValidator_1.serializeJson)(recordData),
                    rawData: (0, dataValidator_1.serializeJson)(recordData),
                    source: recordData.source || 'api',
                    status,
                    dirtyType: validation.dirtyType,
                    dirtyRemark: validation.dirtyRemark,
                    createdBy: user.id
                }
            });
            if (recordData.memberId && status === config_1.CONFIG.RECORD_STATUS.VALID && !inBatchRecord) {
                processedMemberRecords.set(recordData.memberId, {
                    memberName: recordData.memberName,
                    amount: recordData.amount,
                    quantity: recordData.quantity
                });
            }
            results.push({ ...(0, auth_1.filterFieldsByRole)(record, user.role, 'record'), isNew: true });
        }
        await (0, stateMachine_1.recalculateBatchStats)(batchId);
        res.json(results);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/attachments', (0, auth_1.requirePermission)('attachment:upload'), upload.single('file'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const user = req.user;
        const batch = await prisma_1.prisma.batch.findUnique({ where: { id: batchId } });
        if (!batch)
            return res.status(404).json({ error: '批次不存在' });
        const attachment = await prisma_1.prisma.attachment.create({
            data: {
                batchId,
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                storagePath: req.file.path,
                uploadedBy: user.id
            }
        });
        res.status(201).json(attachment);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/submit', (0, auth_1.requirePermission)('batch:submit'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const user = req.user;
        const updated = await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.SUBMITTED, user.id, user.role);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/review', (0, auth_1.requirePermission)('batch:review'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const { reason } = req.body;
        const user = req.user;
        await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.REVIEWING, user.id, user.role);
        const updated = await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.REVIEWED, user.id, user.role, reason);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/freeze', (0, auth_1.requirePermission)('batch:freeze'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const updated = await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.FROZEN, user.id, user.role, reason);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/settle', (0, auth_1.requirePermission)('batch:*'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const updated = await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.SETTLED, user.id, user.role, reason);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/revoke', (0, auth_1.requirePermission)('batch:*'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const { reason } = req.body;
        const user = req.user;
        const updated = await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.REVOKED, user.id, user.role, reason);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.post('/:batchId/archive', (0, auth_1.requirePermission)('batch:*'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const user = req.user;
        const updated = await (0, stateMachine_1.transitionBatch)(batchId, config_1.CONFIG.BATCH_STATUS.ARCHIVED, user.id, user.role);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'batch'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/:batchId', (0, auth_1.requirePermission)('batch:view'), async (req, res) => {
    try {
        const { batchId } = req.params;
        const user = req.user;
        const batch = await prisma_1.prisma.batch.findUnique({
            where: { id: batchId },
            include: {
                records: true,
                attachments: true,
                statusHistories: { orderBy: { operatedAt: 'desc' } }
            }
        });
        if (!batch)
            return res.status(404).json({ error: '批次不存在' });
        const filteredBatch = (0, auth_1.filterFieldsByRole)(batch, user.role, 'batch');
        const filteredRecords = batch.records.map(r => (0, auth_1.filterFieldsByRole)({
            ...r,
            originalContent: (0, dataValidator_1.deserializeJson)(r.originalContent),
            rawData: (0, dataValidator_1.deserializeJson)(r.rawData)
        }, user.role, 'record'));
        res.json({ ...filteredBatch, records: filteredRecords });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/', (0, auth_1.requirePermission)('batch:view'), async (req, res) => {
    try {
        const { recordType, status, storeId, page = 1, limit = 20 } = req.query;
        const user = req.user;
        const where = {};
        if (recordType)
            where.recordType = recordType;
        if (status)
            where.status = status;
        if (storeId)
            where.storeId = storeId;
        const batches = await prisma_1.prisma.batch.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit)
        });
        const total = await prisma_1.prisma.batch.count({ where });
        res.json({
            data: batches.map(b => (0, auth_1.filterFieldsByRole)(b, user.role, 'batch')),
            total,
            page: Number(page),
            limit: Number(limit)
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.put('/records/:recordId/resolve', (0, auth_1.requirePermission)('record:resolve'), async (req, res) => {
    try {
        const { recordId } = req.params;
        const { resolution, remark } = req.body;
        const user = req.user;
        const record = await prisma_1.prisma.record.findUnique({ where: { id: recordId } });
        if (!record)
            return res.status(404).json({ error: '记录不存在' });
        const updated = await prisma_1.prisma.record.update({
            where: { id: recordId },
            data: {
                status: config_1.CONFIG.RECORD_STATUS.RESOLVED,
                resolvedAt: new Date(),
                resolvedBy: user.id,
                resolveRemark: remark,
                ...(resolution && {
                    memberId: resolution.memberId,
                    memberName: resolution.memberName,
                    amount: resolution.amount,
                    quantity: resolution.quantity
                })
            }
        });
        await prisma_1.prisma.statusHistory.create({
            data: {
                recordId,
                fromStatus: record.status,
                toStatus: config_1.CONFIG.RECORD_STATUS.RESOLVED,
                reason: remark,
                operatorRole: user.role,
                operatedBy: user.id
            }
        });
        await (0, stateMachine_1.recalculateBatchStats)(updated.batchId);
        res.json((0, auth_1.filterFieldsByRole)(updated, user.role, 'record'));
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
//# sourceMappingURL=batches.js.map