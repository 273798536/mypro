"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const json2csv_1 = require("json2csv");
const batch_entity_1 = require("../entities/batch.entity");
const batch_status_enum_1 = require("../common/enums/batch-status.enum");
let ExportService = class ExportService {
    constructor(batchRepository) {
        this.batchRepository = batchRepository;
    }
    async getManagerView() {
        const batches = await this.batchRepository.find({
            order: { createdAt: 'DESC' },
        });
        return batches.map(batch => ({
            batchId: batch.id,
            batchNo: batch.batchNo,
            status: batch.status,
            statusBeforeFrozen: batch.statusBeforeFrozen,
            freezeReason: batch.freezeReason,
            manualReason: batch.manualReason,
            totalAmount: batch.totalAmount,
            totalRepairOrders: batch.totalRepairOrders,
            totalSparePartScans: batch.totalSparePartScans,
            totalDirtyRecords: batch.totalDirtyRecords,
            reviewOpinion: batch.reviewOpinion,
            createdByName: batch.createdByName,
            createdAt: batch.createdAt,
        }));
    }
    async exportToCSV() {
        const data = await this.getManagerView();
        const fields = [
            'batchNo',
            'status',
            'statusBeforeFrozen',
            'freezeReason',
            'manualReason',
            'totalAmount',
            'totalRepairOrders',
            'totalSparePartScans',
            'totalDirtyRecords',
            'reviewOpinion',
            'createdByName',
            'createdAt',
        ];
        const json2csvParser = new json2csv_1.Parser({ fields });
        return json2csvParser.parse(data);
    }
    async getStatistics() {
        const batches = await this.batchRepository.find();
        const statusCounts = {};
        let totalAmount = 0;
        let totalFrozen = 0;
        for (const batch of batches) {
            statusCounts[batch.status] = (statusCounts[batch.status] || 0) + 1;
            totalAmount += Number(batch.totalAmount) || 0;
            if (batch.status === batch_status_enum_1.BatchStatus.FROZEN) {
                totalFrozen++;
            }
        }
        return {
            totalBatches: batches.length,
            statusCounts,
            totalAmount,
            totalFrozen,
        };
    }
};
exports.ExportService = ExportService;
exports.ExportService = ExportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(batch_entity_1.Batch)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ExportService);
//# sourceMappingURL=export.service.js.map