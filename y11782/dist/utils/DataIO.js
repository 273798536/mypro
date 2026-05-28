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
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataIO = exports.DataIO = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DataIO {
    constructor(dataDir = path.join(process.cwd(), 'data'), reportsDir = path.join(process.cwd(), 'reports')) {
        this.dataDir = dataDir;
        this.historyDir = path.join(dataDir, 'history');
        this.reportsDir = reportsDir;
        this.ensureDirectories();
    }
    ensureDirectories() {
        [this.dataDir, this.historyDir, this.reportsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    importFromFile(filePath) {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`文件不存在: ${absolutePath}`);
        }
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const data = JSON.parse(content);
        this.validateDataBundle(data);
        return data;
    }
    exportToFile(data, filePath) {
        const absolutePath = path.resolve(filePath);
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(absolutePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    saveHistory(history) {
        const filePath = path.join(this.historyDir, 'history.json');
        fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
    }
    loadHistory() {
        const filePath = path.join(this.historyDir, 'history.json');
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    appendHistory(record) {
        const history = this.loadHistory();
        history.push(record);
        this.saveHistory(history);
    }
    saveSnapshot(data, tag) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `snapshot_${tag}_${timestamp}.json`;
        const filePath = path.join(this.historyDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return filePath;
    }
    listSnapshots() {
        if (!fs.existsSync(this.historyDir)) {
            return [];
        }
        return fs.readdirSync(this.historyDir)
            .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
            .sort()
            .reverse();
    }
    loadSnapshot(fileName) {
        const filePath = path.join(this.historyDir, fileName);
        return this.importFromFile(filePath);
    }
    saveReport(report, fileName, format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFileName = `${fileName}_${timestamp}.${format}`;
        const filePath = path.join(this.reportsDir, fullFileName);
        if (format === 'json') {
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
        }
        else {
            fs.writeFileSync(filePath, report, 'utf-8');
        }
        return filePath;
    }
    listReports() {
        if (!fs.existsSync(this.reportsDir)) {
            return [];
        }
        return fs.readdirSync(this.reportsDir)
            .filter(f => f.endsWith('.json') || f.endsWith('.html'))
            .sort()
            .reverse();
    }
    validateDataBundle(data) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('数据格式错误：应该是一个对象');
        }
        const bundle = data;
        const requiredFields = ['courses', 'prerequisites', 'semesterPlans', 'alternativeCourses', 'studentGrades'];
        for (const field of requiredFields) {
            if (!Array.isArray(bundle[field])) {
                throw new Error(`数据格式错误：${field} 应该是一个数组`);
            }
        }
        if (bundle.courses && Array.isArray(bundle.courses)) {
            bundle.courses.forEach((course, index) => {
                const c = course;
                if (!c.id || !c.name || c.credits === undefined) {
                    throw new Error(`课程数据错误：第 ${index + 1} 门课程缺少必要字段（id, name, credits）`);
                }
            });
        }
        if (bundle.prerequisites && Array.isArray(bundle.prerequisites)) {
            bundle.prerequisites.forEach((prereq, index) => {
                const p = prereq;
                if (!p.courseId || !p.prerequisiteId) {
                    throw new Error(`先修关系错误：第 ${index + 1} 条缺少必要字段（courseId, prerequisiteId）`);
                }
            });
        }
    }
    getDataDir() {
        return this.dataDir;
    }
    getReportsDir() {
        return this.reportsDir;
    }
    getHistoryDir() {
        return this.historyDir;
    }
}
exports.DataIO = DataIO;
exports.dataIO = new DataIO();
//# sourceMappingURL=DataIO.js.map