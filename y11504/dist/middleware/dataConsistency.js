"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addVersionHeader = exports.DataConsistencyMiddleware = void 0;
const Ledger_1 = require("../entities/Ledger");
const hash_1 = require("../utils/hash");
class DataConsistencyMiddleware {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.verifyLedgerHash = async (req, res, next) => {
            const ledgerId = req.params.id;
            if (!ledgerId) {
                next();
                return;
            }
            try {
                const ledger = await this.dataSource.getRepository(Ledger_1.Ledger).findOne({
                    where: { id: ledgerId, isDeleted: false },
                    relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
                });
                if (ledger && ledger.dataHash) {
                    const currentHash = this.calculateLedgerHash(ledger);
                    if (currentHash !== ledger.dataHash) {
                        res.setHeader('X-Data-Consistency', 'warning');
                        res.setHeader('X-Data-Hash-Mismatch', 'true');
                    }
                    else {
                        res.setHeader('X-Data-Consistency', 'verified');
                    }
                }
            }
            catch (error) {
            }
            next();
        };
    }
    calculateLedgerHash(ledger) {
        const data = {
            id: ledger.id,
            ledgerNo: ledger.ledgerNo,
            status: ledger.status,
            dataQuality: ledger.dataQuality,
            repairOrderId: ledger.repairOrderId,
            engineerId: ledger.engineerId,
            engineerName: ledger.engineerName,
            submitTime: ledger.submitTime,
            confirmTime: ledger.confirmTime,
            auditTime: ledger.auditTime,
            rejectReason: ledger.rejectReason,
            rejectBy: ledger.rejectBy,
            confirmBy: ledger.confirmBy,
            auditBy: ledger.auditBy,
            changeReason: ledger.changeReason,
            version: ledger.version,
            partScans: ledger.partScans?.map((p) => ({
                partCode: p.partCode,
                partName: p.partName,
                partType: p.partType,
                quantity: p.quantity,
                batchNo: p.batchNo,
            })) || [],
            receiptPhotos: ledger.receiptPhotos?.map((p) => ({
                photoUrl: p.photoUrl,
                photoHash: p.photoHash,
            })) || [],
            externalReceipts: ledger.externalReceipts?.map((r) => ({
                receiptNo: r.receiptNo,
                source: r.source,
                sourceSystem: r.sourceSystem,
            })) || [],
        };
        return (0, hash_1.generateDataHash)(data);
    }
}
exports.DataConsistencyMiddleware = DataConsistencyMiddleware;
const addVersionHeader = (req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Data-Source', 'ledger-primary');
    next();
};
exports.addVersionHeader = addVersionHeader;
//# sourceMappingURL=dataConsistency.js.map