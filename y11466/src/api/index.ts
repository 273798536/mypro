import {
  getDatabase,
  runMigrations,
  isDatabaseInitialized,
  SampleRepository,
  SizeModificationRepository,
  FabricRepository,
  FabricTransactionRepository,
  RefundRepository,
  ImportRepository,
  CheckRepository,
  AuditRepository,
  TaskRepository
} from '../db';
import {
  ImportService,
  CheckService,
  ExportService,
  ReportService
} from '../services';
import {
  ImportOptions,
  ImportResult,
  CheckOptions,
  CheckResult,
  FixResult,
  ExportOptions,
  ReportOptions
} from '../types';

export class GarmentSampleInspector {
  private sampleRepo: SampleRepository;
  private sizeRepo: SizeModificationRepository;
  private fabricRepo: FabricRepository;
  private fabricTxRepo: FabricTransactionRepository;
  private refundRepo: RefundRepository;
  private importRepo: ImportRepository;
  private checkRepo: CheckRepository;
  private auditRepo: AuditRepository;
  private taskRepo: TaskRepository;
  private defaultUser: string;

  constructor(
    dbPath: string = './garment_inspection.db',
    defaultUser: string = 'system'
  ) {
    this.defaultUser = defaultUser;
    
    if (!isDatabaseInitialized({ dbPath })) {
      const db = getDatabase({ dbPath });
      runMigrations(db);
    }

    const db = getDatabase({ dbPath });
    this.sampleRepo = new SampleRepository(db);
    this.sizeRepo = new SizeModificationRepository(db);
    this.fabricRepo = new FabricRepository(db);
    this.fabricTxRepo = new FabricTransactionRepository(db);
    this.refundRepo = new RefundRepository(db);
    this.importRepo = new ImportRepository(db);
    this.checkRepo = new CheckRepository(db);
    this.auditRepo = new AuditRepository(db);
    this.taskRepo = new TaskRepository(db);
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const service = new ImportService(
      this.sampleRepo,
      this.sizeRepo,
      this.fabricRepo,
      this.fabricTxRepo,
      this.refundRepo,
      this.importRepo,
      this.auditRepo,
      options.importedBy || this.defaultUser
    );
    return service.import(options);
  }

  async check(options: CheckOptions = {}): Promise<CheckResult[]> {
    const service = new CheckService(
      this.sampleRepo,
      this.sizeRepo,
      this.fabricTxRepo,
      this.refundRepo,
      this.checkRepo,
      this.auditRepo,
      this.defaultUser
    );
    return service.runChecks(options);
  }

  async fix(checkId: string): Promise<FixResult> {
    const service = new CheckService(
      this.sampleRepo,
      this.sizeRepo,
      this.fabricTxRepo,
      this.refundRepo,
      this.checkRepo,
      this.auditRepo,
      this.defaultUser
    );
    return service.fixCheck(checkId);
  }

  async fixAll(): Promise<FixResult[]> {
    const service = new CheckService(
      this.sampleRepo,
      this.sizeRepo,
      this.fabricTxRepo,
      this.refundRepo,
      this.checkRepo,
      this.auditRepo,
      this.defaultUser
    );
    const results = service.getCheckResults(false);
    return Promise.all(results.map(r => service.fixCheck(r.checkId)));
  }

  async generateReport(options: ReportOptions = {}) {
    const service = new ReportService(
      this.sampleRepo,
      this.sizeRepo,
      this.fabricTxRepo,
      this.refundRepo,
      this.checkRepo,
      this.importRepo,
      this.auditRepo
    );
    const report = await service.generateBrandPlanningReport();
    return service.formatReport(report, options.format || 'text');
  }

  async export(options: Partial<ExportOptions> & { type?: string } = {} ): Promise<string[]> {
    const service = new ExportService(
      this.sampleRepo,
      this.sizeRepo,
      this.fabricTxRepo,
      this.refundRepo,
      this.checkRepo,
      this.auditRepo
    );

    const type = options.type || 'all';
    const exportOptions = {
      format: options.format || 'xlsx',
      outputDir: options.outputDir || './export',
      includeSource: options.includeSource || false,
      includeHistory: options.includeHistory || false
    };

    if (type === 'all') {
      return service.exportAll(exportOptions);
    }

    switch (type) {
      case 'sample_flow':
        return [await service.exportSampleFlow(exportOptions)];
      case 'size_modification':
        return [await service.exportSizeModification(exportOptions)];
      case 'fabric_inout':
        return [await service.exportFabricTransactions(exportOptions)];
      case 'refund':
        return [await service.exportRefunds(exportOptions)];
      case 'check_results':
        return [await service.exportCheckResults(exportOptions)];
      default:
        return service.exportAll(exportOptions);
    }
  }

  getHistory(options: {
    entityType?: string;
    entityId?: string;
    actor?: string;
    action?: string;
    limit?: number;
  } = {}) {
    const { limit = 50, ...filters } = options;
    return this.auditRepo.find(filters as any).slice(0, limit);
  }

  getRepositories() {
    return {
      sample: this.sampleRepo,
      size: this.sizeRepo,
      fabric: this.fabricRepo,
      fabricTx: this.fabricTxRepo,
      refund: this.refundRepo,
      import: this.importRepo,
      check: this.checkRepo,
      audit: this.auditRepo,
      task: this.taskRepo
    };
  }
}

export { GarmentSampleInspector as GSI };
export default GarmentSampleInspector;
