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
exports.ensureDir = ensureDir;
exports.readJsonFile = readJsonFile;
exports.writeJsonFile = writeJsonFile;
exports.generateUniqueFilename = generateUniqueFilename;
exports.readInputData = readInputData;
exports.writeSchedule = writeSchedule;
exports.listSchedules = listSchedules;
exports.readSchedule = readSchedule;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}
function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}
function writeJsonFile(filePath, data, pretty = true) {
    ensureDir(path.dirname(filePath));
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    fs.writeFileSync(filePath, content, 'utf-8');
}
function generateUniqueFilename(baseName, extension = 'json') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortUuid = (0, uuid_1.v4)().slice(0, 8);
    return `${baseName}_${timestamp}_${shortUuid}.${extension}`;
}
function readInputData(inputDir) {
    const doctors = readJsonFile(path.join(inputDir, 'doctors.json'));
    const departments = readJsonFile(path.join(inputDir, 'departments.json'));
    const leaveRequests = readJsonFile(path.join(inputDir, 'leave-requests.json'));
    const shiftRequirements = readJsonFile(path.join(inputDir, 'shift-requirements.json'));
    const fatigueRules = readJsonFile(path.join(inputDir, 'fatigue-rules.json'));
    const lockedShifts = readJsonFile(path.join(inputDir, 'locked-shifts.json')) || [];
    const existingSchedule = readJsonFile(path.join(inputDir, 'existing-schedule.json'));
    if (!doctors || !departments || !leaveRequests || !shiftRequirements || !fatigueRules) {
        return null;
    }
    return {
        doctors,
        departments,
        leaveRequests,
        shiftRequirements,
        fatigueRules,
        lockedShifts,
        existingSchedule
    };
}
function writeSchedule(outputDir, schedule, name) {
    ensureDir(outputDir);
    const filename = name || generateUniqueFilename('schedule');
    const filePath = path.join(outputDir, filename);
    writeJsonFile(filePath, schedule);
    return filePath;
}
function listSchedules(outputDir) {
    if (!fs.existsSync(outputDir)) {
        return [];
    }
    return fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.json') && f.startsWith('schedule_'))
        .sort()
        .reverse();
}
function readSchedule(outputDir, filename) {
    return readJsonFile(path.join(outputDir, filename));
}
//# sourceMappingURL=io.js.map