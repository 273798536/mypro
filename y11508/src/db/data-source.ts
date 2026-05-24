import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { MedicalDeviceEntity } from '../models/MedicalDevice';
import { InspectionRecordEntity } from '../models/InspectionRecord';
import { CalibrationCertificateEntity } from '../models/CalibrationCertificate';
import { MaintenanceQuoteEntity } from '../models/MaintenanceQuote';
import { SecondaryConfirmEntity } from '../models/SecondaryConfirm';
import { StatusChangeLogEntity } from '../models/StatusChangeLog';
import { ImportFailureEntity, UserEntity } from '../models/ImportFailure';
import { ReplaySessionEntity } from '../models/ReplaySession';
import { ReplayCommandEntity } from '../models/ReplayCommand';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './data/medical_device.db',
  synchronize: true,
  logging: false,
  entities: [
    MedicalDeviceEntity,
    InspectionRecordEntity,
    CalibrationCertificateEntity,
    MaintenanceQuoteEntity,
    SecondaryConfirmEntity,
    StatusChangeLogEntity,
    ImportFailureEntity,
    UserEntity,
    ReplaySessionEntity,
    ReplayCommandEntity
  ],
  migrations: [],
  subscribers: []
});

export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}