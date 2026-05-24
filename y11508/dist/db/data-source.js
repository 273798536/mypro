"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.initializeDatabase = initializeDatabase;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const MedicalDevice_1 = require("../models/MedicalDevice");
const InspectionRecord_1 = require("../models/InspectionRecord");
const CalibrationCertificate_1 = require("../models/CalibrationCertificate");
const MaintenanceQuote_1 = require("../models/MaintenanceQuote");
const SecondaryConfirm_1 = require("../models/SecondaryConfirm");
const StatusChangeLog_1 = require("../models/StatusChangeLog");
const ImportFailure_1 = require("../models/ImportFailure");
const ReplaySession_1 = require("../models/ReplaySession");
const ReplayCommand_1 = require("../models/ReplayCommand");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'sqlite',
    database: './data/medical_device.db',
    synchronize: true,
    logging: false,
    entities: [
        MedicalDevice_1.MedicalDeviceEntity,
        InspectionRecord_1.InspectionRecordEntity,
        CalibrationCertificate_1.CalibrationCertificateEntity,
        MaintenanceQuote_1.MaintenanceQuoteEntity,
        SecondaryConfirm_1.SecondaryConfirmEntity,
        StatusChangeLog_1.StatusChangeLogEntity,
        ImportFailure_1.ImportFailureEntity,
        ImportFailure_1.UserEntity,
        ReplaySession_1.ReplaySessionEntity,
        ReplayCommand_1.ReplayCommandEntity
    ],
    migrations: [],
    subscribers: []
});
async function initializeDatabase() {
    try {
        await exports.AppDataSource.initialize();
        console.log('数据库连接成功');
    }
    catch (error) {
        console.error('数据库连接失败:', error);
        throw error;
    }
}
//# sourceMappingURL=data-source.js.map