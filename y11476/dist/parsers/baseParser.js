"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseParser = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const xlsx = __importStar(require("xlsx"));
class BaseParser {
    constructor(sourceType) {
        this.sourceType = sourceType;
    }
    getFileHash(filePath) {
        const content = fs_1.default.readFileSync(filePath);
        return crypto_1.default.createHash('md5').update(content).digest('hex');
    }
    async parseCSV(filePath) {
        const results = [];
        const fileHash = this.getFileHash(filePath);
        let lineNumber = 1;
        return new Promise((resolve, reject) => {
            const stream = fs_1.default.createReadStream(filePath)
                .pipe((0, csv_parser_1.default)());
            stream.on('data', (row) => {
                lineNumber++;
                const rawData = JSON.stringify(row);
                try {
                    const result = this.parseRow(row, lineNumber);
                    results.push({
                        ...result,
                        rawData
                    });
                }
                catch (error) {
                    results.push({
                        success: false,
                        error: `解析异常: ${error.message}`,
                        lineNumber,
                        rawData
                    });
                }
            });
            stream.on('end', () => {
                resolve({ results, fileHash });
            });
            stream.on('error', (error) => {
                reject(new Error(`读取CSV文件失败: ${error.message}`));
            });
        });
    }
    parseExcel(filePath) {
        const fileHash = this.getFileHash(filePath);
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);
        const results = [];
        rows.forEach((row, index) => {
            const lineNumber = index + 2;
            const rawData = JSON.stringify(row);
            try {
                const result = this.parseRow(row, lineNumber);
                results.push({
                    ...result,
                    rawData
                });
            }
            catch (error) {
                results.push({
                    success: false,
                    error: `解析异常: ${error.message}`,
                    lineNumber,
                    rawData
                });
            }
        });
        return { results, fileHash };
    }
    async parseFile(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const fileName = path_1.default.basename(filePath);
        if (ext === '.csv') {
            const { results, fileHash } = await this.parseCSV(filePath);
            return { results, fileHash, fileName };
        }
        else if (ext === '.xlsx' || ext === '.xls') {
            const { results, fileHash } = this.parseExcel(filePath);
            return { results, fileHash, fileName };
        }
        else {
            throw new Error(`不支持的文件格式: ${ext}，仅支持 .csv, .xlsx, .xls`);
        }
    }
}
exports.BaseParser = BaseParser;
//# sourceMappingURL=baseParser.js.map