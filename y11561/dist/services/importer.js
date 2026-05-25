"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImporter = void 0;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const database_1 = require("../db/database");
const validator_1 = require("./validator");
class DataImporter {
    constructor() {
        this.db = (0, database_1.getDatabase)();
        this.validator = new validator_1.DataValidator();
    }
    async importFromCSV(filePath, source, importedBy, existingBatchId) {
        const fileName = filePath.split('/').pop() || 'unknown';
        let batch = existingBatchId ? this.db.getBatch(existingBatchId) : undefined;
        if (!batch) {
            batch = this.db.createBatch(source, fileName, importedBy);
        }
        else {
            this.db.updateBatch(batch.id, { status: 'importing' });
        }
        const errors = [];
        let totalRecords = 0;
        let importedRecords = 0;
        return new Promise((resolve, reject) => {
            const records = [];
            fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                records.push(data);
            })
                .on('end', async () => {
                totalRecords = records.length;
                for (let i = 0; i < records.length; i++) {
                    const row = records[i];
                    const sourceRowNumber = i + 2;
                    try {
                        await this.processRecord(row, source, sourceRowNumber, batch.id, importedBy, fileName);
                        importedRecords++;
                    }
                    catch (error) {
                        errors.push(`行 ${sourceRowNumber}: ${error.message}`);
                    }
                }
                const existingTotal = existingBatchId ? (batch.totalRecords || 0) : 0;
                const existingImported = existingBatchId ? (batch.importedRecords || 0) : 0;
                this.db.updateBatch(batch.id, {
                    totalRecords: existingTotal + totalRecords,
                    importedRecords: existingImported + importedRecords,
                    status: 'imported'
                });
                const user = this.db.getUserById(importedBy);
                this.db.addStatusChange(batch.id, source, 'pending', 'imported', user?.name || 'system', user?.role || 'entry', `导入完成: ${totalRecords}条记录`, batch.id);
                resolve({
                    batchId: batch.id,
                    batchNo: batch.batchNo,
                    totalRecords,
                    importedRecords,
                    dirtyRecords: 0,
                    errors
                });
            })
                .on('error', (error) => {
                reject(error);
            });
        });
    }
    async processRecord(row, source, sourceRowNumber, batchId, importedBy, sourceFileName) {
        const now = new Date().toISOString();
        switch (source) {
            case 'checkin': {
                const record = this.db.addCheckinRecord({
                    sourceRowNumber,
                    sourceFile: sourceFileName,
                    orderNo: String(row.orderNo || row.订单号 || ''),
                    guestName: String(row.guestName || row.客人姓名 || ''),
                    idCard: String(row.idCard || row.身份证号 || ''),
                    roomNo: String(row.roomNo || row.房号 || ''),
                    roomType: String(row.roomType || row.房型 || ''),
                    checkinDate: String(row.checkinDate || row.入住日期 || ''),
                    checkoutDate: String(row.checkoutDate || row.退房日期 || ''),
                    actualCheckoutDate: row.actualCheckoutDate ? String(row.actualCheckoutDate) : undefined,
                    roomRate: parseFloat(String(row.roomRate || row.房价 || 0)),
                    depositAmount: parseFloat(String(row.depositAmount || row.押金 || 0)),
                    operator: String(row.operator || row.操作员 || ''),
                    status: String(row.status || row.状态 || '正常'),
                    remarks: row.remarks ? String(row.remarks) : undefined,
                    source: 'checkin',
                    importBatch: batchId,
                    importedAt: now,
                    importedBy
                });
                const validation = this.validator.validateCheckinRecord(record, sourceRowNumber, importedBy, batchId);
                for (const dirty of validation.dirtyRecords) {
                    this.db.addDirtyRecord(dirty);
                }
                break;
            }
            case 'deposit': {
                const record = this.db.addDepositRecord({
                    sourceRowNumber,
                    sourceFile: sourceFileName,
                    transactionNo: String(row.transactionNo || row.交易号 || ''),
                    orderNo: String(row.orderNo || row.订单号 || ''),
                    guestName: String(row.guestName || row.客人姓名 || ''),
                    amount: parseFloat(String(row.amount || row.金额 || 0)),
                    paymentMethod: String(row.paymentMethod || row.支付方式 || ''),
                    transactionType: String(row.transactionType || row.交易类型 || 'deposit'),
                    operator: String(row.operator || row.操作员 || ''),
                    transactionTime: String(row.transactionTime || row.交易时间 || ''),
                    remarks: row.remarks ? String(row.remarks) : undefined,
                    source: 'deposit',
                    importBatch: batchId,
                    importedAt: now,
                    importedBy
                });
                const validation = this.validator.validateDepositRecord(record, sourceRowNumber, importedBy, batchId);
                for (const dirty of validation.dirtyRecords) {
                    this.db.addDirtyRecord(dirty);
                }
                break;
            }
            case 'roomChange': {
                const record = this.db.addRoomChangeRecord({
                    sourceRowNumber,
                    sourceFile: sourceFileName,
                    changeNo: String(row.changeNo || row.换房单号 || ''),
                    orderNo: String(row.orderNo || row.订单号 || ''),
                    guestName: String(row.guestName || row.客人姓名 || ''),
                    oldRoomNo: String(row.oldRoomNo || row.原房号 || ''),
                    newRoomNo: String(row.newRoomNo || row.新房号 || ''),
                    oldRoomType: String(row.oldRoomType || row.原房型 || ''),
                    newRoomType: String(row.newRoomType || row.新房型 || ''),
                    oldRoomRate: parseFloat(String(row.oldRoomRate || row.原房价 || 0)),
                    newRoomRate: parseFloat(String(row.newRoomRate || row.新房价 || 0)),
                    changeTime: String(row.changeTime || row.换房时间 || ''),
                    operator: String(row.operator || row.操作员 || ''),
                    reason: row.reason ? String(row.reason) : undefined,
                    source: 'roomChange',
                    importBatch: batchId,
                    importedAt: now,
                    importedBy
                });
                const validation = this.validator.validateRoomChangeRecord(record, sourceRowNumber, importedBy, batchId);
                for (const dirty of validation.dirtyRecords) {
                    this.db.addDirtyRecord(dirty);
                }
                break;
            }
            case 'shift': {
                const record = this.db.addShiftRecord({
                    sourceRowNumber,
                    sourceFile: sourceFileName,
                    shiftNo: String(row.shiftNo || row.班次号 || ''),
                    shiftDate: String(row.shiftDate || row.班次日期 || ''),
                    shiftType: String(row.shiftType || row.班次类型 || 'morning'),
                    operator: String(row.operator || row.操作员 || ''),
                    checkinCount: parseInt(String(row.checkinCount || row.入住数 || 0), 10),
                    checkoutCount: parseInt(String(row.checkoutCount || row.退房数 || 0), 10),
                    totalDeposit: parseFloat(String(row.totalDeposit || row.总押金 || 0)),
                    totalRefund: parseFloat(String(row.totalRefund || row.总退款 || 0)),
                    totalRevenue: parseFloat(String(row.totalRevenue || row.总营收 || 0)),
                    handoverTime: String(row.handoverTime || row.交接时间 || ''),
                    source: 'shift',
                    importBatch: batchId,
                    importedAt: now,
                    importedBy
                });
                const validation = this.validator.validateShiftRecord(record, sourceRowNumber, importedBy, batchId);
                for (const dirty of validation.dirtyRecords) {
                    this.db.addDirtyRecord(dirty);
                }
                break;
            }
            case 'supplement': {
                this.db.addSupplementRecord({
                    sourceRowNumber,
                    sourceFile: sourceFileName,
                    supplementNo: String(row.supplementNo || row.补录单号 || ''),
                    orderNo: String(row.orderNo || row.订单号 || ''),
                    guestName: String(row.guestName || row.客人姓名 || ''),
                    supplementType: String(row.supplementType || row.补录类型 || ''),
                    amount: parseFloat(String(row.amount || row.金额 || 0)),
                    operator: String(row.operator || row.操作员 || ''),
                    supplementTime: String(row.supplementTime || row.补录时间 || ''),
                    reason: row.reason ? String(row.reason) : undefined,
                    source: 'supplement',
                    importBatch: batchId,
                    importedAt: now,
                    importedBy
                });
                break;
            }
        }
    }
    validateBatch(batchId, validatedBy, crossBatch = true) {
        const batch = this.db.getBatch(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        const user = this.db.getUserById(validatedBy);
        this.db.addStatusChange(batchId, batch.source, 'imported', 'checking', user?.name || 'system', user?.role || 'supervisor', '开始数据校验', batchId);
        let crossSourceIssues = 0;
        let duplicateIssues = 0;
        const crossSourceDirty = this.validator.checkCrossSourceConsistency(batchId, validatedBy, crossBatch);
        for (const dirty of crossSourceDirty) {
            this.db.addDirtyRecord(dirty);
            crossSourceIssues++;
        }
        const sources = ['checkin', 'deposit', 'roomChange', 'shift'];
        for (const source of sources) {
            const duplicateDirty = this.validator.checkDuplicates(batchId, source, validatedBy);
            for (const dirty of duplicateDirty) {
                this.db.addDirtyRecord(dirty);
                duplicateIssues++;
            }
        }
        const totalDirty = this.db.getDirtyRecords(batchId).length;
        this.db.updateBatch(batchId, {
            status: 'checking',
            dirtyRecords: totalDirty
        });
        return { crossSourceIssues, duplicateIssues };
    }
}
exports.DataImporter = DataImporter;
