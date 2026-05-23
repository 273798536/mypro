"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../src/types");
const detector_1 = require("../src/utils/detector");
const database_1 = require("../src/utils/database");
function createMockRecord(overrides = {}) {
    return {
        id: (0, database_1.generateId)(),
        source: types_1.DataSource.IMPLANT_BATCH,
        sourceLine: 1,
        sourceFile: 'test.csv',
        batchNumber: 'IMP-001',
        materialName: 'Test Implant',
        materialType: '种植体',
        quantity: 10,
        unitPrice: 100,
        totalAmount: 1000,
        supplier: 'Test Supplier',
        importDate: (0, database_1.getCurrentTime)(),
        importedBy: 'test',
        status: types_1.RecordStatus.PENDING,
        createdAt: (0, database_1.getCurrentTime)(),
        updatedAt: (0, database_1.getCurrentTime)(),
        rawData: {},
        ...overrides
    };
}
function createMockDb(records = []) {
    return {
        users: [],
        records,
        dirtyRecords: [],
        stateChanges: [],
        settings: { initialized: false }
    };
}
describe('Dirty Record Detector', () => {
    describe('detectMissingFields', () => {
        it('should detect missing batchNumber', () => {
            const record = createMockRecord({ batchNumber: '' });
            const result = (0, detector_1.detectMissingFields)(record);
            expect(result).not.toBeNull();
            expect(result?.dirtyType).toBe(types_1.DirtyType.MISSING_FIELD);
            expect(result?.fieldName).toBe('batchNumber');
        });
        it('should detect zero quantity', () => {
            const record = createMockRecord({ quantity: 0 });
            const result = (0, detector_1.detectMissingFields)(record);
            expect(result).not.toBeNull();
            expect(result?.fieldName).toBe('quantity');
        });
        it('should detect negative unitPrice', () => {
            const record = createMockRecord({ unitPrice: -10 });
            const result = (0, detector_1.detectMissingFields)(record);
            expect(result).not.toBeNull();
            expect(result?.fieldName).toBe('unitPrice');
        });
        it('should return null for valid record', () => {
            const record = createMockRecord();
            const result = (0, detector_1.detectMissingFields)(record);
            expect(result).toBeNull();
        });
    });
    describe('detectCrossDate', () => {
        it('should detect cross date for same batch', () => {
            const existing = createMockRecord({
                batchNumber: 'IMP-001',
                appointmentDate: '2024-01-15'
            });
            const newRecord = createMockRecord({
                id: (0, database_1.generateId)(),
                batchNumber: 'IMP-001',
                appointmentDate: '2024-01-20'
            });
            const result = (0, detector_1.detectCrossDate)(newRecord, [existing]);
            expect(result).not.toBeNull();
            expect(result?.dirtyType).toBe(types_1.DirtyType.CROSS_DATE);
        });
        it('should return null for same date', () => {
            const existing = createMockRecord({
                batchNumber: 'IMP-001',
                appointmentDate: '2024-01-15'
            });
            const newRecord = createMockRecord({
                id: (0, database_1.generateId)(),
                batchNumber: 'IMP-001',
                appointmentDate: '2024-01-15'
            });
            const result = (0, detector_1.detectCrossDate)(newRecord, [existing]);
            expect(result).toBeNull();
        });
        it('should return null when no appointmentDate', () => {
            const newRecord = createMockRecord({ appointmentDate: undefined });
            const result = (0, detector_1.detectCrossDate)(newRecord, []);
            expect(result).toBeNull();
        });
    });
    describe('detectNameChanged', () => {
        it('should detect name change for same batch', () => {
            const existing = createMockRecord({
                batchNumber: 'IMP-001',
                materialName: 'Straumann种植体'
            });
            const newRecord = createMockRecord({
                id: (0, database_1.generateId)(),
                batchNumber: 'IMP-001',
                materialName: 'ITI种植体'
            });
            const result = (0, detector_1.detectNameChanged)(newRecord, [existing]);
            expect(result).not.toBeNull();
            expect(result?.dirtyType).toBe(types_1.DirtyType.NAME_CHANGED);
        });
        it('should return null for same name', () => {
            const existing = createMockRecord({
                batchNumber: 'IMP-001',
                materialName: 'Straumann种植体'
            });
            const newRecord = createMockRecord({
                id: (0, database_1.generateId)(),
                batchNumber: 'IMP-001',
                materialName: 'Straumann种植体'
            });
            const result = (0, detector_1.detectNameChanged)(newRecord, [existing]);
            expect(result).toBeNull();
        });
    });
    describe('detectAmountConflict', () => {
        it('should detect amount conflict', () => {
            const record = createMockRecord({
                quantity: 10,
                unitPrice: 100,
                totalAmount: 900
            });
            const result = (0, detector_1.detectAmountConflict)(record);
            expect(result).not.toBeNull();
            expect(result?.dirtyType).toBe(types_1.DirtyType.AMOUNT_CONFLICT);
            expect(result?.expectedValue).toBe('1000.00');
            expect(result?.actualValue).toBe('900.00');
        });
        it('should return null for correct amount', () => {
            const record = createMockRecord({
                quantity: 10,
                unitPrice: 100,
                totalAmount: 1000
            });
            const result = (0, detector_1.detectAmountConflict)(record);
            expect(result).toBeNull();
        });
        it('should allow small tolerance', () => {
            const record = createMockRecord({
                quantity: 10,
                unitPrice: 100,
                totalAmount: 1000.005
            });
            const result = (0, detector_1.detectAmountConflict)(record);
            expect(result).toBeNull();
        });
    });
    describe('detectAllDirty - Idempotency', () => {
        it('should detect multiple issues', () => {
            const record = createMockRecord({
                batchNumber: '',
                quantity: 10,
                unitPrice: 100,
                totalAmount: 900
            });
            const db = createMockDb();
            const results = (0, detector_1.detectAllDirty)(record, db);
            expect(results.length).toBeGreaterThan(0);
        });
        it('running twice should produce consistent results', () => {
            const record = createMockRecord({
                batchNumber: 'IMP-001',
                quantity: 10,
                unitPrice: 100,
                totalAmount: 900
            });
            const db = createMockDb();
            const results1 = (0, detector_1.detectAllDirty)(record, db);
            const results2 = (0, detector_1.detectAllDirty)(record, db);
            expect(results1.length).toBe(results2.length);
            expect(results1[0]?.dirtyType).toBe(results2[0]?.dirtyType);
        });
    });
});
//# sourceMappingURL=detector.test.js.map