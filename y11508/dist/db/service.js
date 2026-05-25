"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const uuid_1 = require("uuid");
const data_source_1 = require("./data-source");
const MedicalDevice_1 = require("../models/MedicalDevice");
const InspectionRecord_1 = require("../models/InspectionRecord");
const CalibrationCertificate_1 = require("../models/CalibrationCertificate");
const MaintenanceQuote_1 = require("../models/MaintenanceQuote");
const SecondaryConfirm_1 = require("../models/SecondaryConfirm");
const StatusChangeLog_1 = require("../models/StatusChangeLog");
const ImportFailure_1 = require("../models/ImportFailure");
const ReplaySession_1 = require("../models/ReplaySession");
const ReplayCommand_1 = require("../models/ReplayCommand");
const types_1 = require("../types");
class DatabaseService {
    constructor() {
        this.deviceRepo = data_source_1.AppDataSource.getRepository(MedicalDevice_1.MedicalDeviceEntity);
        this.inspectionRepo = data_source_1.AppDataSource.getRepository(InspectionRecord_1.InspectionRecordEntity);
        this.calibrationRepo = data_source_1.AppDataSource.getRepository(CalibrationCertificate_1.CalibrationCertificateEntity);
        this.maintenanceRepo = data_source_1.AppDataSource.getRepository(MaintenanceQuote_1.MaintenanceQuoteEntity);
        this.secondaryConfirmRepo = data_source_1.AppDataSource.getRepository(SecondaryConfirm_1.SecondaryConfirmEntity);
        this.statusLogRepo = data_source_1.AppDataSource.getRepository(StatusChangeLog_1.StatusChangeLogEntity);
        this.importFailureRepo = data_source_1.AppDataSource.getRepository(ImportFailure_1.ImportFailureEntity);
        this.userRepo = data_source_1.AppDataSource.getRepository(ImportFailure_1.UserEntity);
        this.replaySessionRepo = data_source_1.AppDataSource.getRepository(ReplaySession_1.ReplaySessionEntity);
        this.replayCommandRepo = data_source_1.AppDataSource.getRepository(ReplayCommand_1.ReplayCommandEntity);
    }
    async createStatusLog(entityType, entityId, oldStatus, newStatus, changedBy, reason) {
        const log = this.statusLogRepo.create({
            id: (0, uuid_1.v4)(),
            entityType,
            entityId,
            oldStatus,
            newStatus,
            changedBy,
            reason
        });
        return this.statusLogRepo.save(log);
    }
    async findDeviceByCode(deviceCode) {
        return this.deviceRepo.findOne({ where: { deviceCode } });
    }
    async createDevice(data) {
        const device = this.deviceRepo.create({
            id: (0, uuid_1.v4)(),
            ...data,
            status: data.status || types_1.DeviceStatus.NORMAL
        });
        return this.deviceRepo.save(device);
    }
    async updateDeviceStatus(deviceId, status, changedBy, reason) {
        const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
        if (!device)
            return null;
        const oldStatus = device.status;
        device.status = status;
        await this.deviceRepo.save(device);
        await this.createStatusLog('device', deviceId, oldStatus, status, changedBy, reason);
        return device;
    }
    async createInspectionRecord(data) {
        const record = this.inspectionRepo.create({
            id: (0, uuid_1.v4)(),
            ...data,
            status: data.status || types_1.RecordStatus.DRAFT
        });
        return this.inspectionRepo.save(record);
    }
    async updateInspectionRecordStatus(id, status, changedBy, reason) {
        const record = await this.inspectionRepo.findOne({ where: { id } });
        if (!record)
            return null;
        const oldStatus = record.status;
        record.status = status;
        await this.inspectionRepo.save(record);
        await this.createStatusLog('inspection', id, oldStatus, status, changedBy, reason);
        return record;
    }
    async createCalibrationCertificate(data) {
        const cert = this.calibrationRepo.create({
            id: (0, uuid_1.v4)(),
            ...data,
            status: data.status || types_1.RecordStatus.DRAFT
        });
        return this.calibrationRepo.save(cert);
    }
    async updateCalibrationCertificateStatus(id, status, changedBy, reason) {
        const cert = await this.calibrationRepo.findOne({ where: { id } });
        if (!cert)
            return null;
        const oldStatus = cert.status;
        cert.status = status;
        await this.calibrationRepo.save(cert);
        await this.createStatusLog('calibration', id, oldStatus, status, changedBy, reason);
        return cert;
    }
    async createMaintenanceQuote(data) {
        const quote = this.maintenanceRepo.create({
            id: (0, uuid_1.v4)(),
            ...data,
            status: data.status || types_1.RecordStatus.DRAFT,
            approvalStatus: data.approvalStatus || 'pending'
        });
        return this.maintenanceRepo.save(quote);
    }
    async updateMaintenanceQuoteStatus(id, status, changedBy, reason) {
        const quote = await this.maintenanceRepo.findOne({ where: { id } });
        if (!quote)
            return null;
        const oldStatus = quote.status;
        quote.status = status;
        await this.maintenanceRepo.save(quote);
        await this.createStatusLog('maintenance', id, oldStatus, status, changedBy, reason);
        return quote;
    }
    async updateMaintenanceQuoteApproval(id, approvalStatus, changedBy, reason) {
        const quote = await this.maintenanceRepo.findOne({ where: { id } });
        if (!quote)
            return null;
        const oldStatus = quote.approvalStatus;
        quote.approvalStatus = approvalStatus;
        await this.maintenanceRepo.save(quote);
        await this.createStatusLog('maintenance_approval', id, oldStatus, approvalStatus, changedBy, reason);
        return quote;
    }
    async createSecondaryConfirm(data) {
        const confirm = this.secondaryConfirmRepo.create({
            id: (0, uuid_1.v4)(),
            ...data,
            status: data.status || types_1.RecordStatus.DRAFT
        });
        return this.secondaryConfirmRepo.save(confirm);
    }
    async updateSecondaryConfirmStatus(id, status, changedBy, reason) {
        const confirm = await this.secondaryConfirmRepo.findOne({ where: { id } });
        if (!confirm)
            return null;
        const oldStatus = confirm.status;
        confirm.status = status;
        await this.secondaryConfirmRepo.save(confirm);
        await this.createStatusLog('secondary_confirm', id, oldStatus, status, changedBy, reason);
        return confirm;
    }
    async createImportFailure(source, rowNumber, rawData, errorMessage, importedBy) {
        const failure = this.importFailureRepo.create({
            id: (0, uuid_1.v4)(),
            source,
            rowNumber,
            rawData,
            errorMessage,
            importedBy
        });
        return this.importFailureRepo.save(failure);
    }
    async createUser(username, role, department) {
        const user = this.userRepo.create({
            id: (0, uuid_1.v4)(),
            username,
            role,
            department
        });
        return this.userRepo.save(user);
    }
    async findUserByUsername(username) {
        return this.userRepo.findOne({ where: { username } });
    }
    async getExpiredCertificates() {
        const now = new Date();
        return this.calibrationRepo
            .createQueryBuilder('cert')
            .where('cert.expiryDate < :now', { now })
            .andWhere('cert.status != :status', { status: types_1.RecordStatus.REJECTED })
            .getMany();
    }
    async getDevices() {
        return this.deviceRepo.find();
    }
    async getInspectionRecords() {
        return this.inspectionRepo.find();
    }
    async getCalibrationCertificates() {
        return this.calibrationRepo.find();
    }
    async getMaintenanceQuotes() {
        return this.maintenanceRepo.find();
    }
    async getSecondaryConfirms() {
        return this.secondaryConfirmRepo.find();
    }
    async getImportFailures() {
        return this.importFailureRepo.find();
    }
    async getStatusLogs(entityType, entityId) {
        const where = {};
        if (entityType)
            where.entityType = entityType;
        if (entityId)
            where.entityId = entityId;
        return this.statusLogRepo.find({ where, order: { changedAt: 'DESC' } });
    }
    async createReplaySession(name, createdBy) {
        const session = this.replaySessionRepo.create({
            id: (0, uuid_1.v4)(),
            name,
            createdBy,
            status: 'running'
        });
        return this.replaySessionRepo.save(session);
    }
    async createReplayCommand(sessionId, order, type, content) {
        const command = this.replayCommandRepo.create({
            id: (0, uuid_1.v4)(),
            sessionId,
            order,
            type,
            content
        });
        return this.replayCommandRepo.save(command);
    }
    async updateReplayCommandResult(commandId, result, duration) {
        const command = await this.replayCommandRepo.findOne({ where: { id: commandId } });
        if (!command)
            return null;
        command.result = result;
        command.executedAt = new Date();
        command.duration = duration;
        return this.replayCommandRepo.save(command);
    }
    async completeReplaySession(sessionId, status) {
        const session = await this.replaySessionRepo.findOne({ where: { id: sessionId } });
        if (!session)
            return null;
        session.status = status;
        session.endTime = new Date();
        return this.replaySessionRepo.save(session);
    }
    async getReplaySessions() {
        return this.replaySessionRepo.find({ relations: ['commands'], order: { startTime: 'DESC' } });
    }
    async getReplayCommands(sessionId) {
        return this.replayCommandRepo.find({ where: { sessionId }, order: { order: 'ASC' } });
    }
    getDeviceRepository() {
        return this.deviceRepo;
    }
    getInspectionRepository() {
        return this.inspectionRepo;
    }
    getCalibrationRepository() {
        return this.calibrationRepo;
    }
    getMaintenanceRepository() {
        return this.maintenanceRepo;
    }
    getSecondaryConfirmRepository() {
        return this.secondaryConfirmRepo;
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=service.js.map