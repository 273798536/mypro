"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSourceType = detectSourceType;
exports.parseCsvFile = parseCsvFile;
exports.extractArchive = extractArchive;
exports.normalizeAppointment = normalizeAppointment;
exports.normalizeLocation = normalizeLocation;
exports.normalizeReview = normalizeReview;
exports.normalizePriceAdjustment = normalizePriceAdjustment;
exports.createTempDir = createTempDir;
exports.cleanupTempDir = cleanupTempDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const unzipper_1 = __importDefault(require("unzipper"));
const uuid_1 = require("uuid");
function detectSourceType(fileName) {
    const lower = fileName.toLowerCase();
    if (lower.includes('预约') || lower.includes('appointment') || lower.includes('order')) {
        return 'appointment';
    }
    if (lower.includes('定位') || lower.includes('签到') || lower.includes('location') || lower.includes('checkin')) {
        return 'location';
    }
    if (lower.includes('评价') || lower.includes('review') || lower.includes('comment')) {
        return 'review';
    }
    if (lower.includes('改价') || lower.includes('调价') || lower.includes('price') || lower.includes('adjust')) {
        return 'price_adjustment';
    }
    return null;
}
function parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        const records = [];
        const rawRecords = [];
        const errors = [];
        let rowNum = 0;
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('headers', () => {
            rowNum = 1;
        })
            .on('data', (data) => {
            rowNum++;
            try {
                rawRecords.push({ row: rowNum, data: { ...data } });
                records.push(data);
            }
            catch (err) {
                errors.push({ row: rowNum, error: err.message });
            }
        })
            .on('end', () => {
            resolve({
                records,
                rawRecords,
                errors,
                sourceFile: path_1.default.basename(filePath),
            });
        })
            .on('error', reject);
    });
}
async function extractArchive(archivePath, outputDir) {
    const extractedFiles = [];
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const directory = await unzipper_1.default.Open.file(archivePath);
    for (const file of directory.files) {
        if (file.type === 'File' && file.path.toLowerCase().endsWith('.csv')) {
            const outputPath = path_1.default.join(outputDir, path_1.default.basename(file.path));
            const content = await file.buffer();
            fs_1.default.writeFileSync(outputPath, content);
            extractedFiles.push(outputPath);
        }
    }
    return extractedFiles;
}
function normalizeAppointment(data, rawRow, sourceFile) {
    return {
        orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
        customerName: String(data.客户姓名 || data.customerName || data.customer || ''),
        phone: String(data.联系电话 || data.phone || data.telephone || ''),
        address: String(data.安装地址 || data.address || ''),
        applianceType: String(data.家电类型 || data.applianceType || data.type || ''),
        appointmentDate: String(data.预约日期 || data.appointmentDate || data.date || ''),
        appointmentTime: String(data.预约时间 || data.appointmentTime || data.time || ''),
        technicianId: data.师傅ID || data.technicianId ? String(data.师傅ID || data.technicianId) : undefined,
        technicianName: data.师傅姓名 || data.technicianName ? String(data.师傅姓名 || data.technicianName) : undefined,
        status: String(data.状态 || data.status || '待处理'),
        rawRow,
        sourceFile,
    };
}
function normalizeLocation(data, rawRow, sourceFile) {
    return {
        orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
        technicianId: String(data.师傅ID || data.technicianId || ''),
        technicianName: String(data.师傅姓名 || data.technicianName || ''),
        checkinTime: String(data.签到时间 || data.checkinTime || data.checkin || ''),
        checkoutTime: data.签退时间 || data.checkoutTime ? String(data.签退时间 || data.checkoutTime) : undefined,
        location: String(data.签到地点 || data.location || ''),
        latitude: data.纬度 || data.latitude ? Number(data.纬度 || data.latitude) : undefined,
        longitude: data.经度 || data.longitude ? Number(data.经度 || data.longitude) : undefined,
        rawRow,
        sourceFile,
    };
}
function normalizeReview(data, rawRow, sourceFile) {
    return {
        orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
        customerName: String(data.客户姓名 || data.customerName || ''),
        rating: Number(data.评分 || data.rating || 5),
        reviewContent: String(data.评价内容 || data.reviewContent || data.content || ''),
        reviewDate: String(data.评价日期 || data.reviewDate || data.date || ''),
        badReason: data.差评原因 || data.badReason ? String(data.差评原因 || data.badReason) : undefined,
        technicianId: data.师傅ID || data.technicianId ? String(data.师傅ID || data.technicianId) : undefined,
        technicianName: data.师傅姓名 || data.technicianName ? String(data.师傅姓名 || data.technicianName) : undefined,
        rawRow,
        sourceFile,
    };
}
function normalizePriceAdjustment(data, rawRow, sourceFile) {
    return {
        orderNo: String(data.订单号 || data.orderNo || data.order_no || ''),
        originalAmount: Number(data.原始金额 || data.originalAmount || 0),
        adjustedAmount: Number(data.调整后金额 || data.adjustedAmount || 0),
        adjustmentReason: String(data.调整原因 || data.adjustmentReason || ''),
        operator: String(data.操作人 || data.operator || ''),
        adjustmentDate: String(data.调整日期 || data.adjustmentDate || data.date || ''),
        rawRow,
        sourceFile,
    };
}
function createTempDir() {
    const tempDir = path_1.default.join(process.cwd(), '.hai-cli', 'temp', (0, uuid_1.v4)());
    fs_1.default.mkdirSync(tempDir, { recursive: true });
    return tempDir;
}
function cleanupTempDir(dir) {
    if (fs_1.default.existsSync(dir)) {
        fs_1.default.rmSync(dir, { recursive: true, force: true });
    }
}
//# sourceMappingURL=importer.js.map