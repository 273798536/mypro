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
                    const currentHash = (0, hash_1.generateLedgerHash)(ledger);
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
}
exports.DataConsistencyMiddleware = DataConsistencyMiddleware;
const addVersionHeader = (req, res, next) => {
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Data-Source', 'ledger-primary');
    next();
};
exports.addVersionHeader = addVersionHeader;
//# sourceMappingURL=dataConsistency.js.map