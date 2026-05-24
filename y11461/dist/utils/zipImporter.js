"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importZipFile = importZipFile;
exports.getDataSourceFromSourceArg = getDataSourceFromSourceArg;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const types_1 = require("../types");
const importer_1 = require("./importer");
function detectDataSourceFromFileName(fileName) {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('implant') || lowerName.includes('种植体') || lowerName.includes('批号')) {
        return types_1.DataSource.IMPLANT_BATCH;
    }
    if (lowerName.includes('appointment') || lowerName.includes('预约') || lowerName.includes('患者')) {
        return types_1.DataSource.APPOINTMENT;
    }
    if (lowerName.includes('invoice') || lowerName.includes('发票') || lowerName.includes('供应商')) {
        return types_1.DataSource.SUPPLIER_INVOICE;
    }
    if (lowerName.includes('manual') || lowerName.includes('补录') || lowerName.includes('临时')) {
        return types_1.DataSource.MANUAL_ENTRY;
    }
    return null;
}
function extractZipToTemp(zipFilePath) {
    const zip = new adm_zip_1.default(zipFilePath);
    const tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'dmi-zip-'));
    zip.extractAllTo(tempDir, true);
    return tempDir;
}
function findCsvFiles(dir) {
    const csvFiles = [];
    function scanDirectory(currentDir) {
        const files = fs_1.default.readdirSync(currentDir);
        for (const file of files) {
            const fullPath = path_1.default.join(currentDir, file);
            const stat = fs_1.default.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            }
            else if (path_1.default.extname(file).toLowerCase() === '.csv') {
                csvFiles.push(fullPath);
            }
        }
    }
    scanDirectory(dir);
    return csvFiles;
}
async function importZipFile(zipFilePath, importedBy, db, forceSource) {
    if (!fs_1.default.existsSync(zipFilePath)) {
        throw new Error(`压缩包不存在: ${zipFilePath}`);
    }
    const tempDir = extractZipToTemp(zipFilePath);
    const csvFiles = findCsvFiles(tempDir);
    const results = [];
    let totalRecords = 0;
    let importedRecords = 0;
    let dirtyRecords = 0;
    let failedFiles = 0;
    for (const csvFile of csvFiles) {
        const fileName = path_1.default.basename(csvFile);
        const source = forceSource || detectDataSourceFromFileName(fileName);
        if (!source) {
            results.push({
                fileName,
                source: types_1.DataSource.MANUAL_ENTRY,
                result: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    dirty: 0,
                    records: [],
                    errors: [`无法自动识别数据来源，跳过文件: ${fileName}`]
                }
            });
            failedFiles++;
            continue;
        }
        try {
            const result = await (0, importer_1.importCsvFile)(csvFile, source, importedBy, db);
            results.push({ fileName, source, result });
            totalRecords += result.total;
            importedRecords += result.success;
            dirtyRecords += result.dirty;
        }
        catch (e) {
            results.push({
                fileName,
                source,
                result: {
                    total: 0,
                    success: 0,
                    failed: 0,
                    dirty: 0,
                    records: [],
                    errors: [`导入失败: ${e.message}`]
                }
            });
            failedFiles++;
        }
    }
    try {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    }
    catch (e) {
    }
    return {
        totalFiles: csvFiles.length,
        processedFiles: results.length,
        failedFiles,
        totalRecords,
        importedRecords,
        dirtyRecords,
        results
    };
}
function getDataSourceFromSourceArg(sourceArg) {
    const sourceMap = {
        implant: types_1.DataSource.IMPLANT_BATCH,
        appointment: types_1.DataSource.APPOINTMENT,
        invoice: types_1.DataSource.SUPPLIER_INVOICE,
        manual: types_1.DataSource.MANUAL_ENTRY
    };
    return sourceMap[sourceArg] || null;
}
//# sourceMappingURL=zipImporter.js.map