import { DatabaseService } from '../db/service';
import { InspectionRecordEntity } from '../models/InspectionRecord';
import { CalibrationCertificateEntity } from '../models/CalibrationCertificate';
import { MaintenanceQuoteEntity } from '../models/MaintenanceQuote';
import { SecondaryConfirmEntity } from '../models/SecondaryConfirm';
export interface ImportResult<T> {
    success: boolean;
    total: number;
    imported: number;
    failed: number;
    records: T[];
    errors: Array<{
        row: number;
        error: string;
        data: any;
    }>;
}
export declare class DataImportService {
    private dbService;
    constructor(dbService: DatabaseService);
    private validateRequiredFields;
    private validateDate;
    importInspectionRecordsFromCSV(filePath: string, importedBy: string): Promise<ImportResult<InspectionRecordEntity>>;
    private validateAndCreateInspectionRecord;
    importCalibrationCertificatesFromCSV(filePath: string, importedBy: string): Promise<ImportResult<CalibrationCertificateEntity>>;
    private validateAndCreateCalibrationCertificate;
    importMaintenanceQuotesFromCSV(filePath: string, importedBy: string): Promise<ImportResult<MaintenanceQuoteEntity>>;
    private validateAndCreateMaintenanceQuote;
    importSecondaryConfirmsFromCSV(filePath: string, importedBy: string): Promise<ImportResult<SecondaryConfirmEntity>>;
    private validateAndCreateSecondaryConfirm;
    private importFromCSV;
}
