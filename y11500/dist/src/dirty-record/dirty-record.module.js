"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirtyRecordModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const dirty_record_service_1 = require("./dirty-record.service");
const dirty_record_entity_1 = require("../entities/dirty-record.entity");
const repair_order_entity_1 = require("../entities/repair-order.entity");
const spare_part_scan_entity_1 = require("../entities/spare-part-scan.entity");
const scan_detail_entity_1 = require("../entities/scan-detail.entity");
const batch_entity_1 = require("../entities/batch.entity");
let DirtyRecordModule = class DirtyRecordModule {
};
exports.DirtyRecordModule = DirtyRecordModule;
exports.DirtyRecordModule = DirtyRecordModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([dirty_record_entity_1.DirtyRecord, repair_order_entity_1.RepairOrder, spare_part_scan_entity_1.SparePartScan, scan_detail_entity_1.ScanDetail, batch_entity_1.Batch]),
        ],
        providers: [dirty_record_service_1.DirtyRecordService],
        exports: [dirty_record_service_1.DirtyRecordService],
    })
], DirtyRecordModule);
//# sourceMappingURL=dirty-record.module.js.map