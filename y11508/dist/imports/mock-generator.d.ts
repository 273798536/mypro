import { DatabaseService } from '../db/service';
export declare class MockDataGenerator {
    private dbService;
    constructor(dbService: DatabaseService);
    private randomFromArray;
    private randomDate;
    generateUsers(): Promise<void>;
    generateDevices(count?: number): Promise<void>;
    generateInspectionRecords(count?: number): Promise<void>;
    generateCalibrationCertificates(count?: number): Promise<void>;
    generateMaintenanceQuotes(count?: number): Promise<void>;
    generateSecondaryConfirms(count?: number): Promise<void>;
    generateAllMockData(): Promise<void>;
}
