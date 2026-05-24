import { DataStoreManager } from './utils/store';
import { DataImporter, ImportResult } from './utils/import';
import { DataChecker, CheckReport } from './utils/check';
import { DataFixer } from './utils/fix';
import { DataExporter, ExportOptions } from './utils/export';
import { ImportMode, DataSource } from './types';

export class ContractComplianceAPI {
  private workspace: string;
  private user: string;
  private store: DataStoreManager;

  constructor(workspace: string, user: string = 'api_user') {
    this.workspace = workspace;
    this.user = user;
    this.store = new DataStoreManager(workspace);
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async import(
    filePath: string,
    source: DataSource,
    mode: ImportMode,
    batchName?: string
  ): Promise<ImportResult> {
    const importer = new DataImporter(this.workspace, this.user);
    return importer.importFromFile(filePath, source, mode, batchName);
  }

  async check(batchId?: string): Promise<CheckReport> {
    const checker = new DataChecker(this.workspace, this.user);
    return checker.runAllChecks(batchId);
  }

  async fix(
    checkResultId: string,
    resolution: string,
    newValue?: any
  ): Promise<boolean> {
    const fixer = new DataFixer(this.workspace, this.user);
    return fixer.resolveCheck(checkResultId, resolution, newValue);
  }

  async fixBatch(
    checkType: string,
    resolution: string,
    batchId?: string
  ): Promise<number> {
    const fixer = new DataFixer(this.workspace, this.user);
    return fixer.batchResolve(checkType, resolution, batchId);
  }

  async getFailedList(batchId?: string) {
    const fixer = new DataFixer(this.workspace, this.user);
    return fixer.getFailedList(batchId);
  }

  async exportCheckReport(options: ExportOptions, batchId?: string): Promise<string> {
    const exporter = new DataExporter(this.workspace);
    return exporter.exportCheckReport(options, batchId);
  }

  async exportContractDetails(contractNo: string, options: ExportOptions): Promise<string> {
    const exporter = new DataExporter(this.workspace);
    return exporter.exportContractDetails(contractNo, options);
  }

  async exportImportHistory(options: ExportOptions): Promise<string> {
    const exporter = new DataExporter(this.workspace);
    return exporter.exportImportHistory(options);
  }

  async exportFullData(options: ExportOptions): Promise<string> {
    const exporter = new DataExporter(this.workspace);
    return exporter.exportFullData(options);
  }

  async getHistory(entityId?: string) {
    return this.store.getChangeLogs(entityId);
  }

  async getContracts() {
    return this.store.getContracts();
  }

  async getContract(contractNo: string) {
    return this.store.getContractByNo(contractNo);
  }

  async getImportBatches() {
    return this.store.getImportBatches();
  }

  async retryFailed(): Promise<ImportResult[]> {
    const importer = new DataImporter(this.workspace, this.user);
    return importer.retryFailedBatches();
  }

  async runFullPipeline(
    importFiles: { path: string; source: DataSource; mode: ImportMode }[],
    exportDir: string
  ): Promise<{
    importResults: ImportResult[];
    checkReport: CheckReport;
    exportPaths: {
      checkReport: string;
      importHistory: string;
      fullData: string;
    };
  }> {
    const importResults: ImportResult[] = [];

    for (const file of importFiles) {
      const result = await this.import(file.path, file.source, file.mode);
      importResults.push(result);
    }

    const checkReport = await this.check();

    const exportOptions: ExportOptions = {
      format: 'json',
      outputDir: exportDir,
      includeRaw: true,
    };

    const checkReportPath = await this.exportCheckReport(exportOptions);
    const importHistoryPath = await this.exportImportHistory(exportOptions);
    const fullDataPath = await this.exportFullData(exportOptions);

    return {
      importResults,
      checkReport,
      exportPaths: {
        checkReport: checkReportPath,
        importHistory: importHistoryPath,
        fullData: fullDataPath,
      },
    };
  }
}
