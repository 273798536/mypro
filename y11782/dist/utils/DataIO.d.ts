import { DataBundle, HistoryRecord } from '../models/types';
export declare class DataIO {
    private dataDir;
    private historyDir;
    private reportsDir;
    constructor(dataDir?: string, reportsDir?: string);
    private ensureDirectories;
    importFromFile(filePath: string): DataBundle;
    exportToFile(data: DataBundle, filePath: string): void;
    saveHistory(history: HistoryRecord[]): void;
    loadHistory(): HistoryRecord[];
    appendHistory(record: HistoryRecord): void;
    saveSnapshot(data: DataBundle, tag: string): string;
    listSnapshots(): string[];
    loadSnapshot(fileName: string): DataBundle;
    saveReport(report: unknown, fileName: string, format?: 'json' | 'html'): string;
    listReports(): string[];
    private validateDataBundle;
    getDataDir(): string;
    getReportsDir(): string;
    getHistoryDir(): string;
}
export declare const dataIO: DataIO;
