import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { AppDataSource } from './data-source';
import { MedicalDeviceEntity } from '../models/MedicalDevice';
import { InspectionRecordEntity } from '../models/InspectionRecord';
import { CalibrationCertificateEntity } from '../models/CalibrationCertificate';
import { MaintenanceQuoteEntity } from '../models/MaintenanceQuote';
import { SecondaryConfirmEntity } from '../models/SecondaryConfirm';
import { StatusChangeLogEntity } from '../models/StatusChangeLog';
import { ImportFailureEntity, UserEntity } from '../models/ImportFailure';
import { ReplaySessionEntity } from '../models/ReplaySession';
import { ReplayCommandEntity } from '../models/ReplayCommand';
import { RecordStatus, DeviceStatus, ImportSource, Role, User } from '../types';

export class DatabaseService {
  private deviceRepo: Repository<MedicalDeviceEntity>;
  private inspectionRepo: Repository<InspectionRecordEntity>;
  private calibrationRepo: Repository<CalibrationCertificateEntity>;
  private maintenanceRepo: Repository<MaintenanceQuoteEntity>;
  private secondaryConfirmRepo: Repository<SecondaryConfirmEntity>;
  private statusLogRepo: Repository<StatusChangeLogEntity>;
  private importFailureRepo: Repository<ImportFailureEntity>;
  private userRepo: Repository<UserEntity>;
  private replaySessionRepo: Repository<ReplaySessionEntity>;
  private replayCommandRepo: Repository<ReplayCommandEntity>;

  constructor() {
    this.deviceRepo = AppDataSource.getRepository(MedicalDeviceEntity);
    this.inspectionRepo = AppDataSource.getRepository(InspectionRecordEntity);
    this.calibrationRepo = AppDataSource.getRepository(CalibrationCertificateEntity);
    this.maintenanceRepo = AppDataSource.getRepository(MaintenanceQuoteEntity);
    this.secondaryConfirmRepo = AppDataSource.getRepository(SecondaryConfirmEntity);
    this.statusLogRepo = AppDataSource.getRepository(StatusChangeLogEntity);
    this.importFailureRepo = AppDataSource.getRepository(ImportFailureEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
    this.replaySessionRepo = AppDataSource.getRepository(ReplaySessionEntity);
    this.replayCommandRepo = AppDataSource.getRepository(ReplayCommandEntity);
  }

  async createStatusLog(
    entityType: string,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    reason: string
  ): Promise<StatusChangeLogEntity> {
    const log = this.statusLogRepo.create({
      id: uuidv4(),
      entityType,
      entityId,
      oldStatus,
      newStatus,
      changedBy,
      reason
    });
    return this.statusLogRepo.save(log);
  }

  async findDeviceByCode(deviceCode: string): Promise<MedicalDeviceEntity | null> {
    return this.deviceRepo.findOne({ where: { deviceCode } });
  }

  async createDevice(data: Partial<MedicalDeviceEntity>): Promise<MedicalDeviceEntity> {
    const device = this.deviceRepo.create({
      id: uuidv4(),
      ...data,
      status: data.status || DeviceStatus.NORMAL
    });
    return this.deviceRepo.save(device);
  }

  async updateDeviceStatus(deviceId: string, status: DeviceStatus, changedBy: string, reason: string): Promise<MedicalDeviceEntity | null> {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) return null;

    const oldStatus = device.status;
    device.status = status;
    await this.deviceRepo.save(device);

    await this.createStatusLog('device', deviceId, oldStatus, status, changedBy, reason);

    return device;
  }

  async createInspectionRecord(data: Partial<InspectionRecordEntity>): Promise<InspectionRecordEntity> {
    const record = this.inspectionRepo.create({
      id: uuidv4(),
      ...data,
      status: data.status || RecordStatus.DRAFT
    });
    return this.inspectionRepo.save(record);
  }

  async updateInspectionRecordStatus(id: string, status: RecordStatus, changedBy: string, reason: string): Promise<InspectionRecordEntity | null> {
    const record = await this.inspectionRepo.findOne({ where: { id } });
    if (!record) return null;

    const oldStatus = record.status;
    record.status = status;
    await this.inspectionRepo.save(record);

    await this.createStatusLog('inspection', id, oldStatus, status, changedBy, reason);

    return record;
  }

  async createCalibrationCertificate(data: Partial<CalibrationCertificateEntity>): Promise<CalibrationCertificateEntity> {
    const cert = this.calibrationRepo.create({
      id: uuidv4(),
      ...data,
      status: data.status || RecordStatus.DRAFT
    });
    return this.calibrationRepo.save(cert);
  }

  async updateCalibrationCertificateStatus(id: string, status: RecordStatus, changedBy: string, reason: string): Promise<CalibrationCertificateEntity | null> {
    const cert = await this.calibrationRepo.findOne({ where: { id } });
    if (!cert) return null;

    const oldStatus = cert.status;
    cert.status = status;
    await this.calibrationRepo.save(cert);

    await this.createStatusLog('calibration', id, oldStatus, status, changedBy, reason);

    return cert;
  }

  async createMaintenanceQuote(data: Partial<MaintenanceQuoteEntity>): Promise<MaintenanceQuoteEntity> {
    const quote = this.maintenanceRepo.create({
      id: uuidv4(),
      ...data,
      status: data.status || RecordStatus.DRAFT,
      approvalStatus: data.approvalStatus || 'pending'
    });
    return this.maintenanceRepo.save(quote);
  }

  async updateMaintenanceQuoteStatus(id: string, status: RecordStatus, changedBy: string, reason: string): Promise<MaintenanceQuoteEntity | null> {
    const quote = await this.maintenanceRepo.findOne({ where: { id } });
    if (!quote) return null;

    const oldStatus = quote.status;
    quote.status = status;
    await this.maintenanceRepo.save(quote);

    await this.createStatusLog('maintenance', id, oldStatus, status, changedBy, reason);

    return quote;
  }

  async updateMaintenanceQuoteApproval(id: string, approvalStatus: 'pending' | 'approved' | 'rejected', changedBy: string, reason: string): Promise<MaintenanceQuoteEntity | null> {
    const quote = await this.maintenanceRepo.findOne({ where: { id } });
    if (!quote) return null;

    const oldStatus = quote.approvalStatus;
    quote.approvalStatus = approvalStatus;
    await this.maintenanceRepo.save(quote);

    await this.createStatusLog('maintenance_approval', id, oldStatus, approvalStatus, changedBy, reason);

    return quote;
  }

  async createSecondaryConfirm(data: Partial<SecondaryConfirmEntity>): Promise<SecondaryConfirmEntity> {
    const confirm = this.secondaryConfirmRepo.create({
      id: uuidv4(),
      ...data,
      status: data.status || RecordStatus.DRAFT
    });
    return this.secondaryConfirmRepo.save(confirm);
  }

  async updateSecondaryConfirmStatus(id: string, status: RecordStatus, changedBy: string, reason: string): Promise<SecondaryConfirmEntity | null> {
    const confirm = await this.secondaryConfirmRepo.findOne({ where: { id } });
    if (!confirm) return null;

    const oldStatus = confirm.status;
    confirm.status = status;
    await this.secondaryConfirmRepo.save(confirm);

    await this.createStatusLog('secondary_confirm', id, oldStatus, status, changedBy, reason);

    return confirm;
  }

  async createImportFailure(
    source: ImportSource,
    rowNumber: number,
    rawData: string,
    errorMessage: string,
    importedBy: string
  ): Promise<ImportFailureEntity> {
    const failure = this.importFailureRepo.create({
      id: uuidv4(),
      source,
      rowNumber,
      rawData,
      errorMessage,
      importedBy
    });
    return this.importFailureRepo.save(failure);
  }

  async createUser(username: string, role: Role, department: string): Promise<UserEntity> {
    const user = this.userRepo.create({
      id: uuidv4(),
      username,
      role,
      department
    });
    return this.userRepo.save(user);
  }

  async findUserByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async getExpiredCertificates(): Promise<CalibrationCertificateEntity[]> {
    const now = new Date();
    return this.calibrationRepo
      .createQueryBuilder('cert')
      .where('cert.expiryDate < :now', { now })
      .andWhere('cert.status != :status', { status: RecordStatus.REJECTED })
      .getMany();
  }

  async getDevices(): Promise<MedicalDeviceEntity[]> {
    return this.deviceRepo.find();
  }

  async getInspectionRecords(): Promise<InspectionRecordEntity[]> {
    return this.inspectionRepo.find();
  }

  async getCalibrationCertificates(): Promise<CalibrationCertificateEntity[]> {
    return this.calibrationRepo.find();
  }

  async getMaintenanceQuotes(): Promise<MaintenanceQuoteEntity[]> {
    return this.maintenanceRepo.find();
  }

  async getSecondaryConfirms(): Promise<SecondaryConfirmEntity[]> {
    return this.secondaryConfirmRepo.find();
  }

  async getImportFailures(): Promise<ImportFailureEntity[]> {
    return this.importFailureRepo.find();
  }

  async getStatusLogs(entityType?: string, entityId?: string): Promise<StatusChangeLogEntity[]> {
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    return this.statusLogRepo.find({ where, order: { changedAt: 'DESC' } });
  }

  async createReplaySession(name: string, createdBy: string): Promise<ReplaySessionEntity> {
    const session = this.replaySessionRepo.create({
      id: uuidv4(),
      name,
      createdBy,
      status: 'running'
    });
    return this.replaySessionRepo.save(session);
  }

  async createReplayCommand(
    sessionId: string,
    order: number,
    type: 'http' | 'db' | 'script',
    content: string
  ): Promise<ReplayCommandEntity> {
    const command = this.replayCommandRepo.create({
      id: uuidv4(),
      sessionId,
      order,
      type,
      content
    });
    return this.replayCommandRepo.save(command);
  }

  async updateReplayCommandResult(
    commandId: string,
    result: string,
    duration: number
  ): Promise<ReplayCommandEntity | null> {
    const command = await this.replayCommandRepo.findOne({ where: { id: commandId } });
    if (!command) return null;

    command.result = result;
    command.executedAt = new Date();
    command.duration = duration;
    return this.replayCommandRepo.save(command);
  }

  async completeReplaySession(sessionId: string, status: 'completed' | 'failed'): Promise<ReplaySessionEntity | null> {
    const session = await this.replaySessionRepo.findOne({ where: { id: sessionId } });
    if (!session) return null;

    session.status = status;
    session.endTime = new Date();
    return this.replaySessionRepo.save(session);
  }

  async getReplaySessions(): Promise<ReplaySessionEntity[]> {
    return this.replaySessionRepo.find({ relations: ['commands'], order: { startTime: 'DESC' } });
  }

  async getReplayCommands(sessionId: string): Promise<ReplayCommandEntity[]> {
    return this.replayCommandRepo.find({ where: { sessionId }, order: { order: 'ASC' } });
  }

  getDeviceRepository(): Repository<MedicalDeviceEntity> {
    return this.deviceRepo;
  }

  getInspectionRepository(): Repository<InspectionRecordEntity> {
    return this.inspectionRepo;
  }

  getCalibrationRepository(): Repository<CalibrationCertificateEntity> {
    return this.calibrationRepo;
  }

  getMaintenanceRepository(): Repository<MaintenanceQuoteEntity> {
    return this.maintenanceRepo;
  }

  getSecondaryConfirmRepository(): Repository<SecondaryConfirmEntity> {
    return this.secondaryConfirmRepo;
  }
}